'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Camera, CreditCard, Fingerprint, User, AlertCircle, RefreshCw } from 'lucide-react'

type Step = 'personal' | 'id_document' | 'selfie' | 'biometric' | 'review'
const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'personal',    label: 'Personal info',   icon: User },
  { id: 'id_document', label: 'ID document',     icon: CreditCard },
  { id: 'selfie',      label: 'Liveness check',  icon: Camera },
  { id: 'biometric',   label: 'Biometric',        icon: Fingerprint },
  { id: 'review',      label: 'Submit',           icon: CheckCircle },
]

type PersonalForm = { dob: string; nationality: string; address: string; city: string; postcode: string }
type IdForm = { idType: string; idNumber: string; idCapture: string | null }

export default function VerifyPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [personal, setPersonal] = useState<PersonalForm>({
    dob: '', nationality: '', address: '', city: '', postcode: '',
  })
  const [idForm, setIdForm] = useState<IdForm>({ idType: 'passport', idNumber: '', idCapture: null })
  const [selfieCapture, setSelfieCapture] = useState<string | null>(null)
  const [livenessScore, setLivenessScore] = useState<number | null>(null)
  const [biometricDone, setBiometricDone] = useState(false)
  const [biometricError, setBiometricError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraMode, setCameraMode] = useState<'id' | 'selfie'>('id')

  const startCamera = useCallback(async (mode: 'id' | 'selfie') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === 'selfie' ? 'user' : 'environment', width: 1280, height: 720 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraMode(mode)
      setCameraActive(true)
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    if (cameraMode === 'id') {
      setIdForm(p => ({ ...p, idCapture: dataUrl }))
    } else {
      setSelfieCapture(dataUrl)
      // Simulate liveness score (in production: send to ML liveness API)
      setLivenessScore(0.94)
    }
  }, [cameraMode, stopCamera])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  const registerBiometric = async () => {
    setBiometricError('')
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser. Try Chrome or Safari on a biometric-enabled device.')
      }
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      if (!available) {
        throw new Error('No biometric sensor found (Face ID / Touch ID / Windows Hello). Please use a device with biometric capability.')
      }

      // Get challenge from server
      const challengeRes = await fetch('/api/auth/webauthn/challenge')
      if (!challengeRes.ok) throw new Error('Failed to get challenge')
      const options = await challengeRes.json()

      // Create credential using platform authenticator (Face ID / Touch ID / Windows Hello)
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: Uint8Array.from(atob(options.challenge.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)),
          user: {
            ...options.user,
            id: Uint8Array.from(atob(options.user.id.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)),
          },
        },
      }) as PublicKeyCredential | null

      if (!credential) throw new Error('Biometric registration cancelled.')

      const response = credential.response as AuthenticatorAttestationResponse
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey?.() || [])))
        .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')

      // Register with server
      const regRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId, publicKey, deviceType: 'platform', counter: 0 }),
      })
      if (!regRes.ok) {
        const data = await regRes.json()
        throw new Error(data.error || 'Registration failed')
      }

      setBiometricDone(true)
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setBiometricError('Biometric authentication was cancelled or denied.')
      } else {
        setBiometricError(e.message || 'Biometric registration failed.')
      }
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: personal.dob,
          nationality: personal.nationality,
          address: `${personal.address}, ${personal.city}, ${personal.postcode}`,
          idType: idForm.idType,
          idNumber: idForm.idNumber,
          idDocumentRef: idForm.idCapture ? 'camera_capture' : 'pending',
          selfieRef: selfieCapture ? 'camera_selfie' : 'pending',
          livenessScore,
          webauthnVerified: biometricDone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">
            We&apos;re reviewing your documents and biometric data. This usually takes 1-2 hours.
            We&apos;ll notify you once complete.
          </p>
          <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700 mb-6 text-left space-y-1">
            <div className="font-semibold">What happens next:</div>
            <div>✓ Document authenticity check</div>
            <div>✓ Face match verification</div>
            <div>✓ AML &amp; sanctions screening</div>
            <div>✓ Account unlocked to Level 1 (£500/day)</div>
          </div>
          <Link href="/dashboard" className="block w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const stepIndex = STEPS.findIndex(s => s.id === STEPS[currentStep].id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Identity verification</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    i < currentStep ? 'bg-emerald-500 text-white' :
                    i === currentStep ? 'bg-violet-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {i < currentStep ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${i === currentStep ? 'text-violet-700' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 0: Personal info */}
        {currentStep === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Personal information</h2>
            <p className="text-gray-500 text-sm mb-5">Required for AML compliance (FCA / FinCEN regulations).</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of birth</label>
                <input type="date" value={personal.dob}
                  onChange={e => setPersonal(p => ({ ...p, dob: e.target.value }))}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality</label>
                <input type="text" value={personal.nationality} placeholder="e.g. British, Nigerian"
                  onChange={e => setPersonal(p => ({ ...p, nationality: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
                <input type="text" value={personal.address} placeholder="123 High Street"
                  onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input type="text" value={personal.city} placeholder="London"
                    onChange={e => setPersonal(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode / ZIP</label>
                  <input type="text" value={personal.postcode} placeholder="SW1A 1AA"
                    onChange={e => setPersonal(p => ({ ...p, postcode: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              disabled={!personal.dob || !personal.nationality || !personal.address || !personal.city}
              className="w-full mt-5 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 1: ID Document with camera */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Identity document</h2>
            <p className="text-gray-500 text-sm mb-5">We use your device camera to capture a clear photo of your ID.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document type</label>
                <select value={idForm.idType}
                  onChange={e => setIdForm(p => ({ ...p, idType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID card</option>
                  <option value="driving_license">Driving licence</option>
                  <option value="residence_permit">Residence permit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document number</label>
                <input type="text" value={idForm.idNumber} placeholder="e.g. 123456789"
                  onChange={e => setIdForm(p => ({ ...p, idNumber: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono" />
              </div>

              {/* Camera / capture area */}
              {cameraActive && cameraMode === 'id' ? (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} className="w-full h-56 object-cover" playsInline muted />
                  <div className="absolute inset-0 border-4 border-violet-400 border-dashed rounded-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 justify-center bg-gradient-to-t from-black/60">
                    <button onClick={capturePhoto}
                      className="px-6 py-2 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                      Capture photo
                    </button>
                    <button onClick={stopCamera}
                      className="px-4 py-2 rounded-full bg-white/20 text-white text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : idForm.idCapture ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={idForm.idCapture} alt="ID capture" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setIdForm(p => ({ ...p, idCapture: null })); startCamera('id') }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-gray-700 hover:bg-gray-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    ✓ Captured
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startCamera('id')}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-violet-300 transition-colors group"
                >
                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-violet-500 mx-auto mb-2 transition-colors" />
                  <div className="text-sm font-medium text-gray-700">Tap to use camera</div>
                  <div className="text-xs text-gray-400 mt-1">Place your document in the frame and capture</div>
                </button>
              )}
            </div>

            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800 mt-4 space-y-0.5">
              <div className="font-semibold mb-1">Tips for a good capture:</div>
              <div>✓ All four corners of your ID must be visible</div>
              <div>✓ No glare or shadows on the document</div>
              <div>✓ All text must be clearly readable</div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCurrentStep(0)} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">Back</button>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!idForm.idNumber}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Selfie / liveness check */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Liveness check</h2>
            <p className="text-gray-500 text-sm mb-5">Take a selfie to verify that you&apos;re a real person. Your face will be matched to your ID.</p>

            {cameraActive && cameraMode === 'selfie' ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
                {/* Face oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 border-4 border-violet-400 rounded-full opacity-70" />
                </div>
                <div className="absolute top-3 left-0 right-0 text-center">
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">Position your face in the oval</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 justify-center bg-gradient-to-t from-black/60">
                  <button onClick={capturePhoto}
                    className="px-6 py-2 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                    Take selfie
                  </button>
                  <button onClick={stopCamera}
                    className="px-4 py-2 rounded-full bg-white/20 text-white text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : selfieCapture ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={selfieCapture} alt="Selfie" className="w-full h-56 object-cover rounded-xl" />
                <button
                  onClick={() => { setSelfieCapture(null); setLivenessScore(null); startCamera('selfie') }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-gray-700 hover:bg-gray-100"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {livenessScore !== null && (
                  <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    ✓ Liveness: {Math.round(livenessScore * 100)}%
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => startCamera('selfie')}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-violet-300 transition-colors group"
              >
                <Camera className="w-10 h-10 text-gray-400 group-hover:text-violet-500 mx-auto mb-2 transition-colors" />
                <div className="text-sm font-medium text-gray-700">Open front camera</div>
                <div className="text-xs text-gray-400 mt-1">Look directly at the camera in good lighting</div>
              </button>
            )}

            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800 mt-4 space-y-0.5">
              <div className="font-semibold mb-1">Tips for a good selfie:</div>
              <div>✓ Good lighting — no harsh shadows on your face</div>
              <div>✓ Look directly at the camera, neutral expression</div>
              <div>✗ No sunglasses, hats, or face coverings</div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { stopCamera(); setCurrentStep(1) }} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">Back</button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!selfieCapture}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Biometric binding (WebAuthn) */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Biometric security</h2>
            <p className="text-gray-500 text-sm mb-5">
              Bind your device biometric (Face ID, Touch ID, or Windows Hello) to your account for enhanced security.
            </p>

            {biometricDone ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="font-bold text-gray-900 mb-1">Biometric registered!</div>
                <div className="text-sm text-gray-500">Your device biometric is now linked to your account.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-violet-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-violet-800 font-semibold text-sm">
                    <Fingerprint className="w-5 h-5" /> What you can use:
                  </div>
                  <div className="text-xs text-violet-700 space-y-1">
                    <div>📱 <strong>iPhone/iPad:</strong> Face ID or Touch ID</div>
                    <div>🤖 <strong>Android:</strong> Fingerprint or Face Unlock</div>
                    <div>💻 <strong>Mac:</strong> Touch ID</div>
                    <div>🖥️ <strong>Windows:</strong> Windows Hello (Face or PIN)</div>
                  </div>
                </div>

                {biometricError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{biometricError}</p>
                  </div>
                )}

                <button
                  onClick={registerBiometric}
                  className="w-full py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                >
                  <Fingerprint className="w-5 h-5" />
                  Register biometric now
                </button>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
                >
                  Skip for now (reduces security)
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCurrentStep(2)} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">Back</button>
              {biometricDone && (
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review and submit */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Review &amp; submit</h2>
            <p className="text-gray-500 text-sm mb-5">Review your information before submitting for verification.</p>

            <div className="space-y-3 mb-6">
              <ReviewRow label="Name" value={personal.nationality ? `${personal.nationality} national` : '—'} step={0} onEdit={setCurrentStep} />
              <ReviewRow label="Date of birth" value={personal.dob} step={0} onEdit={setCurrentStep} />
              <ReviewRow label="Address" value={`${personal.address}, ${personal.city}, ${personal.postcode}`} step={0} onEdit={setCurrentStep} />
              <ReviewRow label="ID document" value={`${idForm.idType.replace('_', ' ')} — ${idForm.idNumber}`} step={1} onEdit={setCurrentStep} />
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Selfie / liveness</span>
                <span className="text-sm font-medium text-emerald-600">✓ Captured {livenessScore ? `(${Math.round(livenessScore * 100)}%)` : ''}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Biometric</span>
                <span className={`text-sm font-medium ${biometricDone ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {biometricDone ? '✓ Registered' : '⚠ Skipped'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 mb-5">
              By submitting, you confirm that all information is accurate and consent to biometric processing for identity verification purposes under our{' '}
              <a href="/privacy" className="text-violet-600 underline">Privacy Policy</a> and GDPR.
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setCurrentStep(3)} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50">Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              >
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : 'Submit verification'}
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-4 text-center text-xs text-gray-400">
          Your data is encrypted end-to-end · GDPR compliant · FCA regulated
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ label, value, step, onEdit }: { label: string; value: string; step: number; onEdit: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
        <button onClick={() => onEdit(step)} className="text-xs text-violet-600 hover:underline">Edit</button>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useRef, useEffect } from "react"
import { Camera, Upload, Trash2, X, RefreshCw, Loader2, User } from "lucide-react"
import { uploadMemberPhoto } from "@/lib/storage"

interface ImageUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
  name?: string
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function ImageUploader({
  value,
  onChange,
  name = "Member",
  size = "md",
  disabled = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const getInitials = (n: string) => {
    if (!n) return "M"
    const parts = n.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }

  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return
    setIsUploading(true)
    setShowMenu(false)
    try {
      const url = await uploadMemberPhoto(file)
      onChange(url)
    } catch (err) {
      console.error("Failed to upload photo:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const startCamera = async () => {
    setCameraError(null)
    setCapturedBlob(null)
    setCapturedPreview(null)
    setShowMenu(false)
    setShowCameraModal(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      setCameraStream(stream)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setCameraError("Could not access camera. Please check permissions or upload an image file.")
    }
  }

  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
      videoRef.current.play().catch(console.error)
    }
  }, [showCameraModal, cameraStream])

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
    setCapturedBlob(null)
    setCapturedPreview(null)
    setCameraError(null)
  }

  const snapPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 640
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob)
          setCapturedPreview(canvas.toDataURL("image/jpeg"))
        }
      },
      "image/jpeg",
      0.9
    )
  }

  const confirmCameraPhoto = async () => {
    if (!capturedBlob) return
    setIsUploading(true)
    stopCamera()
    try {
      const url = await uploadMemberPhoto(capturedBlob)
      onChange(url)
    } catch (err) {
      console.error("Error uploading camera photo:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled || isUploading) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const dimensions =
    size === "sm"
      ? "w-16 h-16 text-lg"
      : size === "lg"
      ? "w-32 h-32 text-3xl"
      : "w-24 h-24 text-xl"

  return (
    <div className="relative inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept="image/*"
        className="hidden"
      />

      <div
        className={`relative group rounded-full overflow-hidden border-2 transition-all cursor-pointer ${dimensions} ${
          isDragOver ? "border-emerald-500 ring-4 ring-emerald-500/20" : "border-zinc-700 hover:border-zinc-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && setShowMenu(!showMenu)}
      >
        {value ? (
          <img src={value} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center">
            {getInitials(name)}
          </div>
        )}

        {/* Hover / Overlay Button */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="font-medium">Change</span>
            </>
          )}
        </div>
      </div>

      {/* Action Menu Popover */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1 text-sm text-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-zinc-800 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-zinc-800 transition-colors"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Take Photo</span>
            </button>
            {value && (
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-zinc-800 text-red-400 transition-colors border-t border-zinc-800/80"
                onClick={() => {
                  onChange(null)
                  setShowMenu(false)
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Webcam Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-semibold text-zinc-100">
                <Camera className="w-5 h-5 text-sky-400" />
                <span>Member Photo Capture</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center gap-4">
              {cameraError ? (
                <div className="text-center py-8 px-4 text-red-400 text-sm">
                  <p>{cameraError}</p>
                </div>
              ) : capturedPreview ? (
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-sky-500 shadow-lg">
                  <img src={capturedPreview} alt="Captured" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-zinc-700 bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                </div>
              )}

              {/* Controls */}
              {!cameraError && (
                <div className="flex items-center gap-3 w-full justify-center mt-2">
                  {capturedPreview ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedBlob(null)
                          setCapturedPreview(null)
                        }}
                        className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={confirmCameraPhoto}
                        disabled={isUploading}
                        className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors text-sm font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/20"
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Use Photo</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={snapPhoto}
                      disabled={!cameraStream}
                      className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white transition-colors font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Take Photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

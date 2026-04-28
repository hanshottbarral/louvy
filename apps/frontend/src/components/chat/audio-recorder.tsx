'use client';

import { Mic, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadAudio } from '@/lib/api';

export function AudioRecorder({
  onAudioReady,
}: {
  onAudioReady: (audioUrl: string) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const resolveSupportedMimeType = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2'];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? '';
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Gravação de áudio não suportada neste navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = resolveSupportedMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          const result = await uploadAudio(blob);
          await onAudioReady(result.url);
        } catch {
          setErrorMessage('Não consegui preparar esse áudio para envio.');
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      setErrorMessage('Permita o microfone para gravar áudio no chat.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {recording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-full bg-[var(--danger)] p-3 text-white"
        >
          <Square size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="rounded-full bg-[var(--accent)] p-3 text-[var(--foreground)]"
        >
          <Mic size={16} />
        </button>
      )}

      {errorMessage ? (
        <p className="max-w-[180px] text-center text-xs text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}

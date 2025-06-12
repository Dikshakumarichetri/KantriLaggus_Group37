import React, { useState, useRef } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonText,
  IonIcon
} from '@ionic/react';
import { micOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import './NewRecording.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';
import { Storage } from '@ionic/storage';

const storage = new Storage();
storage.create();

const NewRecording: React.FC = () => {
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const chunks = useRef<Blob[]>([]);
  const router = useIonRouter();

  const startRecording = async () => {
    setMessage('');

    // SAFARI: Check MediaRecorder support
    if (!window.MediaRecorder) {
      alert('Recording not supported in this browser. Please use Chrome or Firefox.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // SAFARI: Fallback MIME type
      const options = MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      chunks.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setAudioURL(URL.createObjectURL(blob));
        saveRecordingLocally(blob);
      };

      setRecording(mediaRecorder);
      mediaRecorder.start();
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Microphone permission denied or not available.');
    }
  };

  const stopRecording = () => {
    if (recording) {
      recording.stop();
      setRecording(null);
    }
  };

  const saveRecordingLocally = async (blob: Blob) => {
    setIsSaving(true);
    setMessage('Saving...');

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const context = new AudioContext();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;

      await finishSave(duration, blob);
    } catch (e) {
      console.error('Error decoding audio data:', e);
      setMessage('Failed to save recording.');
      setIsSaving(false);
    }
  };

  const finishSave = async (duration: number, blob: Blob) => {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      const existing = (await storage.get('recordings')) || [];

      const newRecording = {
        id: Date.now(),
        filename: `recording-${Date.now()}.${blob.type.split('/')[1] || 'webm'}`,
        audioData: base64Audio,
        audioType: blob.type,
        createdAt: new Date().toISOString(),
        duration: duration
      };

      await storage.set('recordings', [...existing, newRecording]);
      setMessage('Recording saved to library!');
      setIsSaving(false);
    };

    reader.readAsDataURL(blob);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="recording-page">
        <div className="recording-container">
          <div className="recording-nav">
            <IonButton fill="clear" onClick={() => router.push('/dashboard')} className="nav-btn">
              <span style={{ fontSize: "2rem", fontWeight: "bold" }}>&larr;</span>
            </IonButton>
            <ProfileIcon />
          </div>
          <IonText className="recording-title">New Recording</IonText>
          <div className="recording-mic-wrapper">
            <IonIcon icon={micOutline} className="recording-mic-icon" />
          </div>
          <IonText className="recording-instruction">
            Record the speaker,<br />then extract the useful part
          </IonText>
          {recording ? (
            <IonButton expand="block" fill="clear" color="danger" onClick={stopRecording} className="recording-btn">
              Stop Recording
            </IonButton>
          ) : (
            <IonButton expand="block" fill="clear" onClick={startRecording} className="recording-btn">
              Start Recording
            </IonButton>
          )}
          {isSaving && <div className="recording-message">Saving...</div>}
          {message && <div className="recording-message">{message}</div>}
          {audioURL && <audio controls src={audioURL} style={{ marginTop: 10 }} />}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NewRecording;

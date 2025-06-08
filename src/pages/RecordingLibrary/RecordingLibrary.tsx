import React, { useEffect, useState } from 'react';
import {
    IonPage, IonContent, IonText, IonSpinner, IonButton, IonIcon
} from '@ionic/react';
import { arrowBackOutline, createOutline, trashOutline, downloadOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './RecordingLibrary.css';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';

const RecordingLibrary: React.FC = () => {
    const [recordings, setRecordings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const history = useHistory();

    useEffect(() => {
        setLoading(true);
        const stored = localStorage.getItem('recordings');
        const parsed = stored ? JSON.parse(stored) : [];
        setRecordings(parsed);
        setLoading(false);
    }, []);

    const handleEdit = (rec: any) => {
        history.push({
            pathname: `/edit-recording/${rec.id}`, // Use local ID (timestamp)
            state: { filename: rec.filename }
        });
    };

    const handleDelete = (recordingId: number) => {
        if (!window.confirm('Delete this recording?')) return;
        const updated = recordings.filter((rec: any) => rec.id !== recordingId);
        localStorage.setItem('recordings', JSON.stringify(updated));
        setRecordings(updated);
    };

    const downloadBase64 = (base64Data: string, filename: string) => {
        const a = document.createElement('a');
        a.href = base64Data;
        a.download = filename;
        a.click();
    };

    return (
        <IonPage>
            <IonContent fullscreen className="library-page">
                <div className="library-container">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push('/dashboard')}>
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="library-title">My Recordings</IonText>
                    {loading ? (
                        <IonSpinner name="dots" className="loading-spinner" />
                    ) : recordings.length === 0 ? (
                        <IonText className="no-recordings">No recordings found.</IonText>
                    ) : (
                        <div className="recording-list">
                            {recordings.map((rec, i) => (
                                <div className="recording-item" key={rec.id}>
                                    <div className="item-inner">
                                        <div className="recording-meta">
                                            <div className="recording-index">Recording {i + 1}</div>
                                            <div className="recording-name">{rec.filename}</div>
                                        </div>
                                        <audio controls src={rec.audioData} className="recording-audio" />
                                        <div className="recording-actions">
                                            <IonButton fill="clear" size="small" className="edit-btn" onClick={() => handleEdit(rec)}>
                                                <IonIcon icon={createOutline} size="small" color="light" slot="icon-only" />
                                            </IonButton>
                                            <IonButton fill="clear" size="small" className="delete-btn" onClick={() => handleDelete(rec.id)}>
                                                <IonIcon icon={trashOutline} size="small" color="light" slot="icon-only" />
                                            </IonButton>
                                            <IonButton
                                                fill="clear"
                                                size="small"
                                                className="download-btn"
                                                onClick={() => downloadBase64(rec.audioData, rec.filename)}
                                            >
                                                <IonIcon icon={downloadOutline} size="small" color="light" slot="icon-only" />
                                            </IonButton>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default RecordingLibrary;

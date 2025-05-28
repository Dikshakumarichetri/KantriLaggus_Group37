import React, { useEffect, useState } from 'react';
import {
    IonPage, IonContent, IonText, IonSpinner, IonList, IonItem, IonButton, IonIcon, IonLabel
} from '@ionic/react';
import { arrowBackOutline, createOutline, trashOutline, downloadOutline, micOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './RecordingLibrary.css';

const API_URL = 'http://localhost:3001';

const RecordingLibrary: React.FC = () => {
    const [recordings, setRecordings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState<string | null>(null);

    const history = useHistory();

    // Get auth token & user profile
    const authToken = localStorage.getItem('authToken');
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const preferredLanguage = userProfile.language || 'English';

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/recordings`, {
            headers: { Authorization: `Bearer ${authToken}` }
        })
            .then((res) => res.json())
            .then((data) => {
                setRecordings(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [authToken]);

    const handleEdit = (rec: any) => {
        history.push({
            pathname: `/edit-recording/${rec._id}`,
            state: { filename: rec.filename }
        });
    };

    const handleDelete = async (recordingId: string) => {
        if (!window.confirm('Delete this recording?')) return;
        const res = await fetch(`${API_URL}/api/recordings/${recordingId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
            setRecordings(recordings.filter((rec: any) => rec._id !== recordingId));
        } else {
            alert('Failed to delete file.');
        }
    };



    return (
        <IonPage>
            <IonContent fullscreen className="library-page">
                <div className="library-container">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push('/dashboard')}>
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <IonText className="library-title">My Recordings</IonText>
                    {loading ? (
                        <IonSpinner name="dots" className="loading-spinner" />
                    ) : recordings.length === 0 ? (
                        <IonText className="no-recordings">No recordings found.</IonText>
                    ) : (
                        <IonList className="recording-list">
                            {recordings.map((rec, i) => (
                                <IonItem lines="none" className="recording-item" key={rec._id}>
                                    <div className="gradient-border">
                                        <div className="item-inner">
                                            <IonLabel className="recording-meta">
                                                <div className="recording-index">Recording {i + 1}</div>
                                                <div className="recording-name">{rec.filename}</div>
                                            </IonLabel>
                                            <audio controls src={`${API_URL}/recordings/${rec.filename}`} className="recording-audio" />
                                        </div>
                                    </div>
                                    <div className="recording-actions">
                                        <IonButton fill="clear" size="small" className="edit-btn" onClick={() => handleEdit(rec)}>
                                            <IonIcon icon={createOutline} size="small" color="light" slot="icon-only" />
                                        </IonButton>
                                        <IonButton fill="clear" size="small" className="delete-btn" onClick={() => handleDelete(rec._id)}>
                                            <IonIcon icon={trashOutline} size="small" color="light" slot="icon-only" />
                                        </IonButton>
                                        <IonButton fill="clear" size="small" className="download-btn" download={rec.filename} href={`${API_URL}/recordings/${rec.filename}`}>
                                            <IonIcon icon={downloadOutline} size="small" color="light" slot="icon-only" />
                                        </IonButton>


                                    </div>
                                </IonItem>
                            ))}
                        </IonList>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default RecordingLibrary;
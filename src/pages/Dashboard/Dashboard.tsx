import React from 'react';
import { IonPage, IonContent, IonText } from '@ionic/react';
import ProfileIcon from '../../components/ProfileIcon/ProfileIcon';
import './Dashboard.css';
import { Storage } from '@ionic/storage';

const Dashboard: React.FC = () => {
    const storage = new Storage();
    storage.create();

    return (
        <IonPage>
            <IonContent fullscreen className="dashboard-page">
                <div className="dashboard-card">
                    <div className="dashboard-header">
                        <IonText className="dashboard-title">Welcome</IonText>
                        <ProfileIcon />
                    </div>
                    <div className="dashboard-nav">
                        <div className="dashboard-nav-item" tabIndex={0} onClick={() => window.location.href = '/phraselist'}>
                            <IonText className="dashboard-nav-text">Phrase list</IonText>
                        </div>
                        <div className="dashboard-nav-item" tabIndex={0} onClick={() => window.location.href = '/new-recording'}>
                            <IonText className="dashboard-nav-text">Start Recording</IonText>
                        </div>
                        <div className="dashboard-nav-item" tabIndex={0} onClick={() => window.location.href = '/recording-library'}>
                            <IonText className="dashboard-nav-text">Recordings Library</IonText>
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Dashboard;

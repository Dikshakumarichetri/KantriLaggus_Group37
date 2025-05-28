import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonText } from '@ionic/react';
import { logOutOutline, globeOutline, arrowBackOutline, personCircleOutline, createOutline, chevronForwardOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';

import './ProfileSettings.css';

const ProfileSettings: React.FC = () => {
    const [userName, setUserName] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const router = useIonRouter();

    useEffect(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setUserName(data.name ?? '');
                setUserPhone(data.phone ?? '');
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('userProfile');
        localStorage.removeItem('currentUserPhone');
        router.push('/login', 'root');
    };

    const displayName = userName || 'User';
    return (
        <IonPage>
            <IonContent fullscreen className="profile-page">
                <div className="profile-wrapper">
                    <IonButton fill="clear" className="back-btn" routerLink="/dashboard">
                        <IonIcon icon={arrowBackOutline} />
                    </IonButton>

                    <IonText className="profile-title">Profile &amp; Settings</IonText>

                    <div className="profile-avatar">
                        <IonIcon icon={personCircleOutline} size="large" color="light" />
                    </div>

                    <div className="profile-info">
                        <div className="profile-name">
                            {displayName}
                        </div>
                        {userPhone && (
                            <div className="profile-phone">{userPhone}</div>
                        )}
                    </div>

                    <div className="profile-box">
                        <IonButton fill="clear" className="profile-option" expand="block">
                            <IonIcon icon={globeOutline} slot="start" /> Language
                            <IonIcon slot="end" icon={chevronForwardOutline} />
                        </IonButton>
                        <IonButton fill="clear" className="profile-option logout" expand="block" onClick={handleLogout}>
                            <IonIcon icon={logOutOutline} slot="start" /> Log Out
                            <IonIcon slot="end" icon={chevronForwardOutline} />
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default ProfileSettings;
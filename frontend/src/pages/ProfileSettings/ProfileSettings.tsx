import React, { useState, useEffect } from 'react';
import {
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
    IonText,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonTitle,
} from '@ionic/react';
import {
    logOutOutline,
    globeOutline,
    arrowBackOutline,
    personCircleOutline,
    chevronForwardOutline,
    closeOutline,
    checkmarkOutline,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';

import './ProfileSettings.css';

const LANGUAGES = [
    { label: 'Nepali', code: 'ne' },
    { label: 'English', code: 'en' },
    { label: 'Hindi', code: 'hi' },
    { label: 'Spanish', code: 'es' },
    { label: 'French', code: 'fr' },
    { label: 'Chinese', code: 'zh' }

];

const ProfileSettings: React.FC = () => {
    const [userName, setUserName] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const [language, setLanguage] = useState<string>('en');
    const [languageLabel, setLanguageLabel] = useState<string>('English');
    const [showLangModal, setShowLangModal] = useState(false);
    const router = useIonRouter();

    useEffect(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setUserName(data.name ?? '');
                setUserPhone(data.phone ?? '');
                if (data.language) {
                    setLanguage(data.language);
                    const langObj = LANGUAGES.find(l => l.code === data.language);
                    setLanguageLabel(langObj?.label || 'English');
                }
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
    }, []);

    // Keep local language label up to date
    useEffect(() => {
        const langObj = LANGUAGES.find(l => l.code === language);
        setLanguageLabel(langObj?.label || 'English');
    }, [language]);

    const handleLogout = async () => {
        localStorage.removeItem('userProfile');
        localStorage.removeItem('currentUserPhone');
        router.push('/login', 'root');
    };

    // When user picks a new language
    const handleSelectLanguage = (lang: { label: string; code: string }) => {
        setLanguage(lang.code);
        setLanguageLabel(lang.label);

        // Save to userProfile in localStorage
        const stored = localStorage.getItem('userProfile');
        let data = {};
        if (stored) {
            try {
                data = JSON.parse(stored);
            } catch { }
        }
        const newProfile = { ...data, language: lang.code };
        localStorage.setItem('userProfile', JSON.stringify(newProfile));
        setShowLangModal(false);
    };

    const displayName = userName || 'User';

    return (
        <IonPage>
            <IonContent fullscreen className="profile-page">
                <div className="profile-wrapper">
                    <IonButton fill="clear" className="back-btn" routerLink="/dashboard">
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>

                    <IonText className="profile-title">Profile &amp; Settings</IonText>

                    <div className="profile-avatar">
                        <IonIcon icon={personCircleOutline} size="large" color="light" />
                    </div>

                    <div className="profile-info">
                        <div className="profile-name">{displayName}</div>
                        {userPhone && (
                            <div className="profile-phone">{userPhone}</div>
                        )}
                    </div>

                    <div className="profile-box">
                        <IonButton
                            fill="clear"
                            className="profile-option"
                            expand="block"
                            onClick={() => setShowLangModal(true)}
                        >
                            <IonIcon icon={globeOutline} slot="start" />
                            Language: <b style={{ marginLeft: 6 }}>{languageLabel}</b>
                            <IonIcon slot="end" icon={chevronForwardOutline} />
                        </IonButton>
                        <IonButton fill="clear" className="profile-option logout" expand="block" onClick={handleLogout}>
                            <IonIcon icon={logOutOutline} slot="start" /> Log Out
                            <IonIcon slot="end" icon={chevronForwardOutline} />
                        </IonButton>
                    </div>

                    {/* Language Selection Modal */}
                    <IonModal isOpen={showLangModal} onDidDismiss={() => setShowLangModal(false)}>
                        <IonHeader>
                            <IonToolbar>
                                <IonTitle>Select Language</IonTitle>
                                <IonButton slot="end" fill="clear" onClick={() => setShowLangModal(false)}>
                                    <IonIcon icon={closeOutline} />
                                </IonButton>
                            </IonToolbar>
                        </IonHeader>
                        <IonContent>
                            <IonList>
                                {LANGUAGES.map(lang => (
                                    <IonItem
                                        button
                                        key={lang.code}
                                        onClick={() => handleSelectLanguage(lang)}
                                        color={lang.code === language ? 'primary' : ''}
                                    >
                                        <IonLabel>{lang.label}</IonLabel>
                                        {lang.code === language && (
                                            <IonIcon icon={checkmarkOutline} color="success" slot="end" />
                                        )}
                                    </IonItem>
                                ))}
                            </IonList>
                        </IonContent>
                    </IonModal>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default ProfileSettings;
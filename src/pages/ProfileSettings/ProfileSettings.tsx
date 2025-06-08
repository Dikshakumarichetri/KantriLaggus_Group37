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
import { Storage } from '@ionic/storage';

const LANGUAGES = [
    { label: 'Nepali', code: 'ne' },
    { label: 'English', code: 'en' },
    { label: 'Hindi', code: 'hi' },
    { label: 'Spanish', code: 'es' },
    { label: 'French', code: 'fr' },
    { label: 'Chinese', code: 'zh' }
];

const storage = new Storage();
storage.create();

const ProfileSettings: React.FC = () => {
    const [userName, setUserName] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const [language, setLanguage] = useState<string>('en');
    const [languageLabel, setLanguageLabel] = useState<string>('English');
    const [showLangModal, setShowLangModal] = useState(false);
    const router = useIonRouter();

    useEffect(() => {
        const loadProfile = async () => {
            const stored = await storage.get('userProfile');
            if (stored) {
                setUserName(stored.name ?? '');
                setUserPhone(stored.phone ?? '');
                if (stored.language) {
                    setLanguage(stored.language);
                    const langObj = LANGUAGES.find(l => l.code === stored.language);
                    setLanguageLabel(langObj?.label || 'English');
                }
            }
        };
        loadProfile();
    }, []);

    useEffect(() => {
        const langObj = LANGUAGES.find(l => l.code === language);
        setLanguageLabel(langObj?.label || 'English');
    }, [language]);

    const handleLogout = async () => {
        await storage.remove('userProfile');
        await storage.remove('currentUserPhone');
        router.push('/login', 'root');
    };

    const handleSelectLanguage = async (lang: { label: string; code: string }) => {
        setLanguage(lang.code);
        setLanguageLabel(lang.label);

        const stored = await storage.get('userProfile') || {};
        const newProfile = { ...stored, language: lang.code };
        await storage.set('userProfile', newProfile);
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

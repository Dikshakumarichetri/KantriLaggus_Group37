import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonText
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './Signup.css';
import { Storage } from '@ionic/storage';

const LANGUAGE_OPTIONS = [
    { label: "English", value: "en" },
    { label: "Spanish", value: "es" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Hindi", value: "hi" },
    { label: "Nepali", value: "ne" }
];

const storage = new Storage();
storage.create();

const Signup: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [language, setLanguage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const handleSignup = async () => {
        setError('');
        if (!phone || !name || !language) {
            setError('Phone, name, and language are required.');
            return;
        }

        setLoading(true);

        try {
            const user = { phone, name, language };
            await storage.set('userProfile', user);
            await storage.set('authToken', 'local-dev-token');
            history.replace('/dashboard');
        } catch (err) {
            setError('Storage error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonContent fullscreen={true} className="signup-page">
                <div className="signup-container">
                    <h2 className="signup-title">Sign Up</h2>
                    <IonInput
                        label="Phone no"
                        labelPlacement="floating"
                        fill="outline"
                        type="tel"
                        className="input-field"
                        onIonChange={e => setPhone(e.detail.value!)}
                    />
                    <IonInput
                        label="Name"
                        labelPlacement="floating"
                        fill="outline"
                        type="text"
                        className="input-field"
                        onIonChange={e => setName(e.detail.value!)}
                    />
                    <IonSelect
                        value={language}
                        placeholder="Select a language"
                        interface="popover"
                        fill="outline"
                        className="input-field"
                        onIonChange={e => setLanguage(e.detail.value!)}
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <IonSelectOption key={opt.value} value={opt.value}>{opt.label}</IonSelectOption>
                        ))}
                    </IonSelect>

                    <IonButton
                        className="signup-button"
                        expand="block"
                        onClick={handleSignup}
                        disabled={loading}
                    >
                        {loading ? 'Signing up...' : 'Signup'}
                    </IonButton>

                    {error && (
                        <IonText color="danger" style={{ display: 'block', marginTop: 12 }}>
                            {error}
                        </IonText>
                    )}

                    <IonText className="signup-footer">
                        Already have an account? <a href="/login">Login</a>
                    </IonText>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Signup;

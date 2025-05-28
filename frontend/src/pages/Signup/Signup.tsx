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

// API endpoint for user signup; change this URL if switching to login or other auth endpoints
const API_URL = 'http://localhost:3001/api/auth/register';;
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
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, name, language })
            });
            const data = await response.json();

            if (!response.ok) {
                // Surface backend error message clearly
                setError(data.error || data.message || 'Signup failed. Please check your details and try again.');
                setLoading(false);
                return;
            }

            // Handle cases where backend returns token and/or user data
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            if (data.user) {
                localStorage.setItem('userProfile', JSON.stringify(data.user));
            } else {
                // If no user object returned, save the submitted data as fallback
                localStorage.setItem('userProfile', JSON.stringify({ phone, name, language }));
            }

            // Redirect to dashboard after successful signup
            history.replace('/dashboard');
        } catch (err: any) {
            setError('Network error. Please try again.');
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
                        <IonSelectOption value="English">English</IonSelectOption>
                        <IonSelectOption value="Spanish">Spanish</IonSelectOption>
                        <IonSelectOption value="French">French</IonSelectOption>
                        <IonSelectOption value="German">German</IonSelectOption>
                        <IonSelectOption value="Hindi">Hindi</IonSelectOption>
                        <IonSelectOption value="Nepali">Nepali</IonSelectOption>
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
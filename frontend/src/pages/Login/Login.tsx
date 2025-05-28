import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonInput,
    IonButton,
    IonText
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './Login.css';

const API_URL = 'http://localhost:3001/api/auth/login';

const Login: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const handleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'Login failed');
                setLoading(false);
                return;
            }
            const data = await response.json();
            // Store user profile and optional token
            localStorage.setItem('userProfile', JSON.stringify(data.user || {}));
            localStorage.setItem('currentUserPhone', phone);
            if (data.token) localStorage.setItem('token', data.token);
            setLoading(false);
            history.replace('/dashboard');
        } catch (err: any) {
            setError('Unable to login, try again.');
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonContent fullscreen className="login-page">
                <div className="login-container">
                    <h2 className="login-title">Login</h2>
                    <IonText>Enter your phone number</IonText>
                    <IonInput
                        placeholder="+1 555 123 4567"
                        value={phone}
                        onIonChange={e => setPhone(e.detail.value!)}
                        className="input-field"
                    />
                    {error && (
                        <IonText color="danger" className="login-error">
                            {error}
                        </IonText>
                    )}
                    <IonButton
                        className="login-button"
                        expand="block"
                        onClick={handleLogin}
                        disabled={!phone || loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </IonButton>
                    <IonText className="login-footer">
                        Don't have an account? <a href="/signup">Sign Up</a>
                    </IonText>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;
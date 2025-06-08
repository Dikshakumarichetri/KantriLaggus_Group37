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
import { Storage } from '@ionic/storage';

const storage = new Storage();
storage.create();

const Login: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const user = { phone, createdAt: new Date().toISOString() };

            await storage.set('userProfile', user);
            await storage.set('currentUserPhone', phone);
            await storage.set('token', 'mock-local-token');

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

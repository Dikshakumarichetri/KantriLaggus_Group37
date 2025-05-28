import { IonPage, IonContent, IonButton, IonText } from '@ionic/react';
import './Welcome.css';

const Welcome: React.FC = () => (
    <IonPage>
        <IonContent fullscreen className="welcome-page">
            <div className="welcome-container">
                <IonText className="welcome-title">Kantri Langgus</IonText>
                <IonText className="welcome-description">
                    Supporting cross-lingual collaboration<br />
                    through speaker recordings and real-world translation practice in the field.
                </IonText>
                <IonButton className="welcome-button" expand="block" routerLink="/signup">
                    GET STARTED
                </IonButton>
            </div>
        </IonContent>
    </IonPage>
);

export default Welcome;
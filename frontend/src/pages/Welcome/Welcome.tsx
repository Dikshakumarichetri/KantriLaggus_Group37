import { IonPage, IonContent, IonButton, IonText } from '@ionic/react';
import './Welcome.css';
import { arrowForwardOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
const Welcome: React.FC = () => (
    <IonPage>
        <IonContent fullscreen className="welcome-page">
            <div className="welcome-container">
                <IonText className="welcome-title"><span>Kantri</span> <span>Langgus</span></IonText>
                <IonText className="welcome-description">
                    Supporting cross-lingual collaboration<br />
                    through speaker recordings and real-world translation practice in the field.
                </IonText>
                <IonButton className="welcome-button" expand="block" routerLink="/signup">
                    <IonIcon icon={arrowForwardOutline} style={{ fontSize: 28, marginRight: 10, marginLeft: -6 }} />
                    GET STARTED
                </IonButton>
            </div>
        </IonContent>
    </IonPage>
);

export default Welcome;
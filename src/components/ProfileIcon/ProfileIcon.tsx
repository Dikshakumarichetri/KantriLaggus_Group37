import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';
import './ProfileIcon.css';

const ProfileIcon: React.FC = () => (
    <IonButton
        fill="clear"
        className="profile-icon"
        routerLink="/profile"
        aria-label="Profile"
    >
        <IonIcon icon={personCircleOutline} size="large" color="light" />
    </IonButton>
);

export default ProfileIcon;
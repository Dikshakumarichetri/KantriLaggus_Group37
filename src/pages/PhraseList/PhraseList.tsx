import React, { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonText,
    IonButton,
    IonIcon,
} from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { Storage } from '@ionic/storage';
import "./PhraseList.css";
import ProfileIcon from "../../components/ProfileIcon/ProfileIcon";

type LocalRecording = {
    id: string;
    filename: string;
    audioData: string;
    date: string;
};

const PhraseList: React.FC = () => {
    const [pair, setPair] = useState<LocalRecording[] | null>(null);
    const history = useHistory();

    useEffect(() => {
        const loadStorage = async () => {
            const storage = new Storage();
            await storage.create();
            const storedLocal = await storage.get('recordings');
            let parsed: LocalRecording[] = [];
            try {
                parsed = Array.isArray(storedLocal)
                    ? storedLocal
                    : JSON.parse(storedLocal);
            } catch {
                parsed = [];
            }
            // Get latest pair (they are always saved in pairs, latest last)
            const sorted = parsed
                .filter(r => r && r.audioData && r.filename && r.date)
                .sort((a, b) => +new Date(b.date) - +new Date(a.date));
            setPair(sorted.slice(0, 2).reverse()); // reverse so orig first, trans second
        };
        loadStorage();
    }, []);

    return (
        <IonPage>
            <IonContent fullscreen className="phrase-list-bg">
                <div className="phrase-list-card">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push("/dashboard")}>
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="phrase-list-title">My Latest Phrase Pair</IonText>
                    <div className="pair-card">
                        {(!pair || pair.length < 2) ? (
                            <IonText color="medium" style={{ marginTop: 30 }}>No phrase pair found. Please save both segments.</IonText>
                        ) : (
                            <>
                                {/* Grouped Pair */}
                                <div className="pair-audio-row">
                                    <div className="pair-audio-block">
                                        <IonText color="primary" className="pair-label">Original Phrase</IonText>
                                        <div className="pair-filename">{pair[0].filename}</div>
                                        <audio controls src={pair[0].audioData} className="recording-audio" />
                                    </div>
                                    <div className="pair-audio-block">
                                        <IonText color="primary" className="pair-label">Translated Phrase</IonText>
                                        <div className="pair-filename">{pair[1].filename}</div>
                                        <audio controls src={pair[1].audioData} className="recording-audio" />
                                    </div>
                                </div>
                                <div className="pair-date">
                                    Saved: {new Date(pair[0].date).toLocaleString()}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default PhraseList;
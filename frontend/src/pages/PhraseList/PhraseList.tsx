import React, { useEffect, useState } from "react";
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonText,
    IonButtons,
    IonIcon,
    IonSpinner,
    useIonToast,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { arrowBack } from "ionicons/icons";

type PhraseItem = {
    filename: string;
    transcription?: string;
    language?: string;
    date: string | number; // ISO string or timestamp
};

const API_URL = "http://localhost:3001"; // or wherever your backend is

const PhraseList: React.FC = () => {
    const [phrases, setPhrases] = useState<PhraseItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [transcribingIdx, setTranscribingIdx] = useState<number | null>(null);
    const history = useHistory();
    const [present] = useIonToast();

    // Load phraseList from localStorage on mount
    useEffect(() => {
        loadPhraseList();
    }, []);

    const loadPhraseList = () => {
        const data = localStorage.getItem("phraseList");
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    const valid = parsed.filter(item => item && item.filename);
                    setPhrases(valid);
                } else {
                    setPhrases([]);
                }
            } catch {
                setPhrases([]);
            }
        } else {
            setPhrases([]);
        }
    };

    const handleTranscribe = async (phrase: PhraseItem, idx: number) => {
        setTranscribingIdx(idx);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/transcribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: phrase.filename,
                    language: phrase.language || "en",
                }),
            });
            const data = await res.json();
            if (!data.transcript) {
                present({
                    message: "Transcription failed or was blank.",
                    duration: 1800,
                    color: "danger",
                });
            } else {
                // Update localStorage
                const phraseList = JSON.parse(localStorage.getItem("phraseList") || "[]");
                const localIdx = phraseList.findIndex(
                    (p: PhraseItem) => p.filename === phrase.filename
                );
                if (localIdx !== -1) {
                    phraseList[localIdx].transcription = data.transcript;
                    localStorage.setItem("phraseList", JSON.stringify(phraseList));
                }
                // Update state to trigger re-render
                setPhrases([...phraseList]);
                present({
                    message: "Transcription completed!",
                    duration: 1300,
                    color: "success",
                });
            }
        } catch (e) {
            present({
                message: "Transcription error.",
                duration: 1800,
                color: "danger",
            });
        }
        setTranscribingIdx(null);
        setLoading(false);
    };

    const renderCard = (phrase: PhraseItem, idx: number) => {
        let dateObj: Date;
        if (typeof phrase.date === "number") {
            dateObj = new Date(phrase.date);
        } else {
            dateObj = new Date(phrase.date);
        }
        const dateStr = dateObj.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        return (
            <IonCard key={idx} className="phrase-card">
                <IonCardHeader className="phrase-card-header">
                    <div>
                        <IonCardTitle className="phrase-filename">{phrase.filename}</IonCardTitle>
                        {phrase.language && (
                            <IonCardSubtitle className="phrase-lang">
                                {phrase.language}
                            </IonCardSubtitle>
                        )}
                    </div>
                    <IonText color="medium" className="phrase-date">{dateStr}</IonText>
                </IonCardHeader>
                <IonCardContent className="phrase-content">
                    {phrase.transcription && phrase.transcription.length > 0 ? (
                        <span>{phrase.transcription}</span>
                    ) : (
                        <span style={{ color: "#bbb" }}>No transcription available.</span>
                    )}
                    <br />
                    <IonButton
                        size="small"
                        disabled={transcribingIdx === idx}
                        onClick={() => handleTranscribe(phrase, idx)}
                        className="transcribe-btn"
                    >
                        {transcribingIdx === idx ? <IonSpinner name="dots" /> : "Transcribe"}
                    </IonButton>
                </IonCardContent>
            </IonCard>
        );
    };

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton onClick={() => history.push("/dashboard")} fill="clear">
                            <IonIcon icon={arrowBack} slot="icon-only" />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Phrase List</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen className="ion-padding" style={{ "--background": "#fafbfc" }}>
                <div className="phrase-list-container">
                    {phrases.length === 0 ? (
                        <IonText color="medium" className="empty-msg">
                            No transcriptions yet.
                        </IonText>
                    ) : (
                        phrases
                            .slice()
                            .reverse()
                            .map((phrase, idx) => renderCard(phrase, idx))
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default PhraseList;
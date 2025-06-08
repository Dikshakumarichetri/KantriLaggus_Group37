import React, { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonText,
    IonSpinner,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    useIonToast
} from "@ionic/react";
import { arrowBackOutline, trashOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import "./PhraseList.css";
import ProfileIcon from "../../components/ProfileIcon/ProfileIcon";

const API_URL = "http://localhost:3001";
const LANGUAGE_OPTIONS = [
    { label: "English", value: "en" },
    { label: "Nepali", value: "ne" },
    { label: "Hindi", value: "hi" },
];
const LANGUAGE_LABEL_MAP = Object.fromEntries(
    LANGUAGE_OPTIONS.map(opt => [opt.value, opt.label])
);

type RecordingItem = {
    _id: string;
    filename: string;
    date: string | number;
    translation?: string; // for displaying translation on this session
    language?: string;
};

const PhraseList: React.FC = () => {
    const [recordings, setRecordings] = useState<RecordingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedLang, setSelectedLang] = useState<{ [key: string]: string }>({});
    const [present] = useIonToast();
    const history = useHistory();

    const authToken = localStorage.getItem("authToken");
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const userLanguage = userProfile.language || "en";

    useEffect(() => {
        fetchRecordings();

    }, [authToken]);

    const fetchRecordings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/recordings`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const data = await res.json();
            setRecordings(data);
        } catch {
            setRecordings([]);
        }
        setLoading(false);
    };

    const handleDelete = async (recordingId: string) => {
        if (!window.confirm("Delete this recording?")) return;
        setDeleting(recordingId);
        const res = await fetch(`${API_URL}/api/recordings/${recordingId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
            setRecordings(recordings.filter((rec) => rec._id !== recordingId));
            present({ message: "Deleted!", duration: 1100, color: "danger" });
        } else {
            present({ message: "Failed to delete file.", duration: 1800, color: "danger" });
        }
        setDeleting(null);
    };

    // Handle translation (display translation in-session)
    const handleTranslate = async (rec: RecordingItem) => {
        setTranslating(rec._id);
        const targetLanguage = selectedLang[rec._id] || "en";
        try {
            const res = await fetch(`${API_URL}/transcribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    filename: rec.filename,
                    sourceLanguage: userLanguage,
                    targetLanguage
                }),
            });
            const data = await res.json();
            if (!data.transcript) {
                present({ message: "Translation failed or was blank.", duration: 1800, color: "danger" });
            } else {
                setRecordings((prev) =>
                    prev.map((item) =>
                        item._id === rec._id
                            ? { ...item, translation: data.transcript, language: targetLanguage }
                            : item
                    )
                );
                present({
                    message: `Translation to ${LANGUAGE_LABEL_MAP[targetLanguage] || targetLanguage} completed!`,
                    duration: 1300,
                    color: "success",
                });
            }
        } catch {
            present({ message: "Translation error.", duration: 1800, color: "danger" });
        }
        setTranslating(null);
    };

    // Show latest first
    const sortedRecordings = [...recordings].sort((a, b) => +new Date(b.date) - +new Date(a.date));

    return (
        <IonPage>
            <IonContent fullscreen className="phrase-list-bg">
                <div className="phrase-list-card">
                    <IonButton
                        fill="clear"
                        className="back-btn"
                        onClick={() => history.push("/dashboard")}
                    >
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="phrase-list-title">My PhraseList</IonText>
                    <div className="phrase-list-container">
                        {loading ? (
                            <IonSpinner name="dots" className="loading-spinner" />
                        ) : sortedRecordings.length === 0 ? (
                            <IonText color="medium" className="empty-msg">
                                No recordings found.
                            </IonText>
                        ) : (
                            sortedRecordings.map((rec, i) => (
                                <div className="recording-item" key={rec._id}>
                                    <div className="item-inner">
                                        <div className="recording-meta">
                                            <div className="recording-index">Recording {i + 1}</div>
                                            <div className="recording-name">{rec.filename}</div>
                                        </div>
                                        <audio controls src={`${API_URL}/recordings/${rec.filename}`} className="recording-audio" />
                                        <div style={{ marginTop: 8 }}>
                                            <IonSelect
                                                interface="popover"
                                                value={selectedLang[rec._id] || "en"}
                                                placeholder="Select Target Language"
                                                onIonChange={e =>
                                                    setSelectedLang({ ...selectedLang, [rec._id]: e.detail.value })
                                                }
                                                className="lang-select"
                                                style={{ width: 160 }}
                                            >
                                                {LANGUAGE_OPTIONS.map(opt => (
                                                    <IonSelectOption key={opt.value} value={opt.value}>{opt.label}</IonSelectOption>
                                                ))}
                                            </IonSelect>
                                            <IonButton
                                                size="small"
                                                fill="clear"
                                                disabled={translating === rec._id}
                                                onClick={() => handleTranslate(rec)}
                                                className="translate-btn"
                                                style={{ marginTop: 10 }}
                                            >
    {translating === rec._id ? <IonSpinner name="dots" /> : 'Translate'}

                                                {/* {translating === rec._id && <IonSpinner name="dots" />} */}
                                            </IonButton>
                                        </div>
                                        {rec.translation && (
                                            <div className="recording-translation" style={{ marginTop: 10 }}>
                                                <b>Translation ({LANGUAGE_LABEL_MAP[rec.language!] || rec.language}):</b>
                                                <br />
                                                <IonText className="recording-translation-text">{rec.translation}</IonText>
                                            </div>
                                        )}
                                        <div className="recording-actions">
                                            <IonButton fill="clear" size="small" className="delete-btn" onClick={() => handleDelete(rec._id)}>
                                                <IonIcon icon={trashOutline} size="small" color="light" slot="icon-only" />
                                            </IonButton>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default PhraseList;
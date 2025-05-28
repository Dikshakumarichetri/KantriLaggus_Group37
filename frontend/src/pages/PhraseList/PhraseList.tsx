import React, { useState } from "react";
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonText, IonButtons, IonIcon, IonSpinner, useIonToast,
    IonSelect, IonSelectOption, useIonViewWillEnter
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { arrowBack, micOutline, trashOutline } from "ionicons/icons";
import "./PhraseList.css";

type PhraseItem = {
    _id: string;
    filename: string;
    translation?: string;
    language?: string;
    date: string | number;
};

type RecordingItem = {
    _id: string;
    filename: string;
    date: string | number;
};

const API_URL = "http://localhost:3001";
const LANGUAGE_OPTIONS = [
    { label: "English", value: "en" },
    { label: "Nepali", value: "ne" },
    { label: "Hindi", value: "hi" },
    // Add more as needed
];
const LANGUAGE_CODE_MAP: { [key: string]: string } = {
    English: "en",
    Nepali: "ne",
    Hindi: "hi",
    // Add more as needed
};

const PhraseList: React.FC = () => {
    const [phrases, setPhrases] = useState<PhraseItem[]>([]);
    const [recordings, setRecordings] = useState<RecordingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedLang, setSelectedLang] = useState<{ [key: string]: string }>({});
    const [present] = useIonToast();
    const history = useHistory();

    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const userLanguageName = userProfile.language || "English";
    const userLanguage = LANGUAGE_CODE_MAP[userLanguageName] || "en";
    const authToken = localStorage.getItem('authToken');

    useIonViewWillEnter(() => {
        fetchAll();
    });

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [phrasesRes, recordingsRes] = await Promise.all([
                fetch(`${API_URL}/api/phrases`, { headers: { Authorization: `Bearer ${authToken}` } }),
                fetch(`${API_URL}/api/recordings`, { headers: { Authorization: `Bearer ${authToken}` } })
            ]);
            const phrasesData = await phrasesRes.json();
            const recordingsData = await recordingsRes.json();
            setPhrases(phrasesData);
            setRecordings(recordingsData);
        } catch {
            setPhrases([]);
            setRecordings([]);
        }
        setLoading(false);
    };

    // Recordings not yet in phrases
    const unprocessedRecordings = recordings.filter(
        rec => !phrases.some(phrase => phrase.filename === rec.filename)
    );

    // Delete phrase or recording
    const handleDelete = async (item: PhraseItem | RecordingItem, isRecording: boolean) => {
        setDeleting(item._id);
        try {
            if (isRecording) {
                // Delete recording
                const res = await fetch(`${API_URL}/api/recordings/${item._id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                if (!res.ok) throw new Error();
                setRecordings(prev => prev.filter(r => r._id !== item._id));
            } else {
                // Delete phrase
                const res = await fetch(`${API_URL}/api/phrases/${item._id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                if (!res.ok) throw new Error();
                setPhrases(prev => prev.filter(p => p._id !== item._id));
            }
            present({ message: "Deleted!", duration: 1100, color: "danger" });
        } catch {
            present({ message: "Failed to delete.", duration: 1800, color: "danger" });
        }
        setDeleting(null);
    };

    const handleTranslate = async (
        item: PhraseItem | RecordingItem,
        isRecording: boolean
    ) => {
        setTranslating(item._id);
        try {
            const targetLanguage = selectedLang[item._id] || "en";
            const body: any = {
                filename: item.filename,
                sourceLanguage: userLanguage,
                targetLanguage
            };
            if (!isRecording && (item as PhraseItem)._id) {
                body.phraseId = (item as PhraseItem)._id;
            }

            const res = await fetch(`${API_URL}/transcribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.transcript) {
                present({
                    message: "Translation failed or was blank.",
                    duration: 1800,
                    color: "danger",
                });
            } else {
                if (isRecording) {
                    // Save phrase to backend
                    await fetch(`${API_URL}/api/phrases`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            filename: item.filename,
                            translation: data.transcript,
                            language: targetLanguage
                        })
                    });
                    // Just refetch everything for correct ordering
                    fetchAll();
                } else {
                    setPhrases(prev =>
                        prev.map(p =>
                            p._id === item._id
                                ? { ...p, translation: data.transcript, language: targetLanguage }
                                : p
                        )
                    );
                }
                present({
                    message: `Translation to ${LANGUAGE_OPTIONS.find(l => l.value === targetLanguage)?.label || targetLanguage} completed!`,
                    duration: 1300,
                    color: "success",
                });
            }
        } catch {
            present({
                message: "Translation error.",
                duration: 1800,
                color: "danger",
            });
        }
        setTranslating(null);
    };

    // Show latest first (newest date at the top)
    const sortedRecordings = [...unprocessedRecordings].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const sortedPhrases = [...phrases].sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const renderCard = (item: PhraseItem | RecordingItem, isRecording = false) => {
        let dateObj: Date = typeof item.date === "number" ? new Date(item.date) : new Date(item.date);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        const langLabel =
            "language" in item && item.language
                ? LANGUAGE_OPTIONS.find(x => x.value === item.language)?.label || item.language
                : undefined;
        return (
            <IonCard key={item._id} className="phrase-card">
                <IonCardHeader className="phrase-card-header">
                    <div>
                        <IonCardTitle className="phrase-filename">{item.filename}</IonCardTitle>
                        {langLabel && (
                            <IonCardSubtitle className="phrase-lang">
                                {langLabel}
                            </IonCardSubtitle>
                        )}
                    </div>
                    <IonText color="medium" className="phrase-date">{dateStr}</IonText>
                </IonCardHeader>
                <IonCardContent className="phrase-content">
                    {isRecording ? (
                        <span style={{ color: "#bbb" }}>Not yet translated.</span>
                    ) : ("translation" in item && item.translation && item.translation.length > 0) ? (
                        <span>{item.translation}</span>
                    ) : (
                        <span style={{ color: "#bbb" }}>No translation available.</span>
                    )}
                    <br />
                    <IonSelect
                        interface="popover"
                        value={selectedLang[item._id] || "en"}
                        placeholder="Select Target Language"
                        onIonChange={e =>
                            setSelectedLang({ ...selectedLang, [item._id]: e.detail.value })
                        }
                        className="lang-select"
                        style={{ width: 160, marginTop: 10 }}
                    >
                        {LANGUAGE_OPTIONS.map(opt => (
                            <IonSelectOption key={opt.value} value={opt.value}>{opt.label}</IonSelectOption>
                        ))}
                    </IonSelect>
                    <IonButton
                        size="small"
                        disabled={translating === item._id}
                        onClick={() => handleTranslate(item, isRecording)}
                        className="translate-btn"
                        style={{ marginTop: 8, marginRight: 8 }}
                    >
                        <IonIcon icon={micOutline} size="small" color="light" slot="icon-only" />
                        {translating === item._id && <IonSpinner name="dots" />}
                    </IonButton>
                    <IonButton
                        size="small"
                        fill="clear"
                        disabled={deleting === item._id}
                        onClick={() => handleDelete(item, isRecording)}
                        className="delete-btn"
                        style={{ marginTop: 8 }}
                    >
                        <IonIcon icon={trashOutline} size="small" color="danger" slot="icon-only" />
                        {deleting === item._id && <IonSpinner name="dots" />}
                    </IonButton>
                </IonCardContent>
            </IonCard>
        );
    };

    // Show latest recordings and phrases first (newest at top)
    const itemsToShow = [
        ...sortedRecordings.map((rec) => renderCard(rec, true)),
        ...sortedPhrases.map((phrase) => renderCard(phrase, false))
    ];

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton onClick={() => history.push("/dashboard")} fill="clear">
                            <IonIcon icon={arrowBack} slot="icon-only" />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Phrase List & Recordings</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen className="ion-padding phrase-list-bg">
                <div className="phrase-list-container">
                    {loading ? (
                        <IonSpinner name="dots" className="loading-spinner" />
                    ) : itemsToShow.length === 0 ? (
                        <IonText color="medium" className="empty-msg">
                            No phrases or recordings yet.
                        </IonText>
                    ) : (
                        itemsToShow
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default PhraseList;
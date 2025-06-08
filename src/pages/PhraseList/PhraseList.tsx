import React, { useEffect, useState } from "react";
import {
    IonPage,
    IonContent,
    IonText,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    useIonToast
} from "@ionic/react";
import { arrowBackOutline, trashOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { Storage } from '@ionic/storage';
import "./PhraseList.css";
import ProfileIcon from "../../components/ProfileIcon/ProfileIcon";

type LocalRecording = {
    id: string;
    filename: string;
    audioData: string;
    date: string;
    language?: string;
    customLanguage?: string;
};

const LANGUAGE_OPTIONS = [
    { label: "English", value: "en" },
    { label: "Nepali", value: "ne" },
    { label: "Hindi", value: "hi" },
    { label: "Other", value: "other" },
];

const PhraseList: React.FC = () => {
    const [pairs, setPairs] = useState<LocalRecording[][]>([]);
    const [langs, setLangs] = useState<{ [id: string]: string }>({});
    const [customLangs, setCustomLangs] = useState<{ [id: string]: string }>({});
    const [inputCache, setInputCache] = useState<{ [id: string]: string }>({});
    const [showSave, setShowSave] = useState<{ [id: string]: boolean }>({});
    const [saving, setSaving] = useState(false);
    const [present] = useIonToast();
    const history = useHistory();

    // Helper to reload all pairs from storage
    const loadPairs = async () => {
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
        // Group into pairs: [original, translation], [original, translation], etc.
        const valid = parsed.filter(r => r && r.audioData && r.filename && r.date);
        let newPairs: LocalRecording[][] = [];
        for (let i = 0; i < valid.length - 1; i += 2) {
            newPairs.unshift([valid[i], valid[i + 1]]);
        }
        setPairs(newPairs);

        // Fill language state for each phrase in every pair
        let initialLangs: { [id: string]: string } = {};
        let initialCustom: { [id: string]: string } = {};
        let initialCache: { [id: string]: string } = {};
        let initialShowSave: { [id: string]: boolean } = {};
        newPairs.forEach(pair => {
            pair.forEach(rec => {
                initialLangs[rec.id] = rec.language || "";
                initialCustom[rec.id] = rec.customLanguage || "";
                initialCache[rec.id] = rec.customLanguage || "";
                initialShowSave[rec.id] = false;
            });
        });
        setLangs(initialLangs);
        setCustomLangs(initialCustom);
        setInputCache(initialCache);
        setShowSave(initialShowSave);
    };

    useEffect(() => {
        loadPairs();
    }, []);

    // Save both language and customLanguage for a segment
    const saveSegmentLang = async (recId: string, langValue: string, customValue?: string) => {
        setSaving(true);
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
        const idx = parsed.findIndex(r => r.id === recId);
        if (idx !== -1) {
            parsed[idx] = {
                ...parsed[idx],
                language: langValue,
                customLanguage: langValue === "other" ? (customValue || "") : undefined
            };
            await storage.set('recordings', parsed);
            present({ message: "Language saved!", duration: 1100, color: "success" });
        }
        setSaving(false);
    };

    const handleLangChange = (recId: string, langValue: string) => {
        setLangs(prev => ({ ...prev, [recId]: langValue }));
        if (langValue !== "other") {
            setCustomLangs(prev => ({ ...prev, [recId]: "" }));
            setShowSave(prev => ({ ...prev, [recId]: false }));
            saveSegmentLang(recId, langValue);
        } else {
            setShowSave(prev => ({ ...prev, [recId]: true }));
        }
    };

    const handleCustomLangInput = (recId: string, value: string) => {
        setInputCache(prev => ({
            ...prev,
            [recId]: value
        }));
        setShowSave(prev => ({
            ...prev,
            [recId]: true
        }));
    };

    const handleSaveCustom = (recId: string) => {
        setCustomLangs(prev => ({
            ...prev,
            [recId]: inputCache[recId] || ""
        }));
        setShowSave(prev => ({
            ...prev,
            [recId]: false
        }));
        saveSegmentLang(recId, "other", inputCache[recId]);
    };

    // Delete both recordings in the pair
    const handleDeletePair = async (pair: LocalRecording[]) => {
        if (!window.confirm("Delete this phrase pair?")) return;
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
        // Remove both by id
        const idsToDelete = pair.map(r => r.id);
        const updated = parsed.filter(r => !idsToDelete.includes(r.id));
        await storage.set('recordings', updated);
        present({ message: "Pair deleted.", duration: 1200, color: "danger" });
        // Reload list
        loadPairs();
    };

    return (
        <IonPage>
            <IonContent fullscreen className="phrase-list-bg">
                <div className="phrase-list-card">
                    <IonButton fill="clear" className="back-btn" onClick={() => history.push("/dashboard")}>
                        <IonIcon icon={arrowBackOutline} slot="icon-only" />
                    </IonButton>
                    <ProfileIcon />
                    <IonText className="phrase-list-title">My Phrase Pairs</IonText>
                    {(!pairs || pairs.length === 0) ? (
                        <IonText color="medium" style={{ marginTop: 30 }}>No phrase pairs found. Please save segments.</IonText>
                    ) : (
                        <div>
                            {pairs.map((pair, pidx) => (
                                <div className="pair-card" key={pair[0].id + pair[1].id}>
                                    <div className="pair-audio-row">
                                        {pair.map((rec, ridx) => (
                                            <div className="pair-audio-block" key={rec.id}>
                                                <IonText color="primary" className="pair-label">{ridx === 0 ? "Original Phrase" : "Translated Phrase"}</IonText>
                                                <div className="pair-filename">{rec.filename}</div>
                                                <audio controls src={rec.audioData} className="recording-audio" />
                                                <IonSelect
                                                    placeholder="Select Language"
                                                    value={langs[rec.id] || ""}
                                                    onIonChange={e => handleLangChange(rec.id, e.detail.value)}
                                                    disabled={saving}
                                                    style={{ marginTop: 12, marginBottom: 4, width: 180 }}
                                                >
                                                    {LANGUAGE_OPTIONS.map(opt => (
                                                        <IonSelectOption key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </IonSelectOption>
                                                    ))}
                                                </IonSelect>
                                                {langs[rec.id] === "other" && (
                                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
                                                        <IonInput
                                                            placeholder="Enter custom language"
                                                            value={inputCache[rec.id] || ""}
                                                            onIonInput={e => handleCustomLangInput(rec.id, (e.detail && typeof e.detail.value === "string" ? e.detail.value : ""))}
                                                            style={{
                                                                margin: "0 8px 0 0",
                                                                width: 155,
                                                                background: "#fff",
                                                                borderRadius: "8px",
                                                                border: "1.1px solid #d6d7e0",
                                                                paddingLeft: 10,
                                                                fontSize: "1rem"
                                                            }}
                                                        />
                                                        <IonButton
                                                            size="small"
                                                            style={{ minWidth: 62 }}
                                                            onClick={() => handleSaveCustom(rec.id)}
                                                            disabled={!inputCache[rec.id]}
                                                        >
                                                            Save
                                                        </IonButton>
                                                    </div>
                                                )}
                                                {(rec.language === "other" && rec.customLanguage && !showSave[rec.id]) && (
                                                    <div style={{ fontSize: '0.97rem', color: '#888', marginTop: 3, marginLeft: 2 }}>
                                                        <b>Custom Language:</b> {rec.customLanguage}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pair-date">
                                        Saved: {new Date(pair[0].date).toLocaleString()}
                                    </div>
                                    <IonButton
                                        color="danger"
                                        fill="outline"
                                        style={{ marginTop: 18 }}
                                        onClick={() => handleDeletePair(pair)}
                                    >
                                        <IonIcon icon={trashOutline} slot="start" /> Delete Pair
                                    </IonButton>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default PhraseList;
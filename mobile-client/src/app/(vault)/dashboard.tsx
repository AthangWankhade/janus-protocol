import { useRouter } from "expo-router";
import {
  Check,
  File,
  FileText,
  Image as ImageIcon,
  Lock,
  Mic,
  Palette,
  Paperclip,
  Pause,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Search,
  StopCircle,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// FIX: Use legacy API to get access to 'getContentUriAsync' as per Expo SDK 52+ requirements
import PatternBackground from "@/components/PatternBackground"; // <--- NEW
import { deriveKey } from "@/services/crypto/encryption";
import { NoteService } from "@/services/noteService";
import { StorageService } from "@/services/storageService"; // <--- Added import
import { syncService } from "@/services/sync/syncService";
import { useAppStore } from "@/store/useAppStore";
import { Buffer } from "buffer";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
// @ts-ignore
import { getContentUriAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import {
  actions,
  RichEditor,
  RichToolbar,
} from "react-native-pell-rich-editor";

const LOADER_MESSAGES = [
  "Decrypting your secrets... 🕵️‍♂️",
  "Feeding the hamsters... 🐹",
  "Consulting the oracle... 🔮",
  "Hiding the evidence... 🗑️",
  "Unlocking the vault... 🔓",
  "Shuffling the pixels... 🎲",
  "Polishing the diamonds... 💎",
];

const FunnyLoader = ({ visible }: { visible: boolean }) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setMessage(
        LOADER_MESSAGES[Math.floor(Math.random() * LOADER_MESSAGES.length)]
      );
      const interval = setInterval(() => {
        setMessage(
          LOADER_MESSAGES[Math.floor(Math.random() * LOADER_MESSAGES.length)]
        );
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.8)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#10B981" />
        <Text
          style={{
            color: "#FFF",
            marginTop: 20,
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          {message}
        </Text>
      </View>
    </Modal>
  );
};

export default function VaultDashboard() {
  const router = useRouter();
  const lockVault = useAppStore((state) => state.lockVault);
  // const isVaultUnlocked = useAppStore((state) => state.isVaultUnlocked); // Unused
  // const isInteractionActive = useAppStore((state) => state.isInteractionActive); // Unused
  const setInteractionActive = useAppStore(
    (state) => state.setInteractionActive
  );
  const backgroundPattern = useAppStore((state) => state.backgroundPattern);
  const setBackgroundPattern = useAppStore(
    (state) => state.setBackgroundPattern
  );

  const richText = useRef<RichEditor>(null);

  const [notes, setNotes] = useState<any[]>([]);
  const [masterKey, setMasterKey] = useState<Buffer | null>(null);
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "MEDIA" | "DOCS" | "TRASH"
  >("ALL");

  // Form State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [currentNoteTitle, setCurrentNoteTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Changed to array
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]); // Changed to array

  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUris, setRecordedAudioUris] = useState<string[]>([]); // Changed to array
  const [initialAudioUris, setInitialAudioUris] = useState<string[]>([]); // Track existing to avoid dupes
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null); // Track which one is playing
  const recordingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const PROTOTYPE_SALT = "a1b2c3d4e5f67890a1b2c3d4e5f67890";
    const { key } = deriveKey("2608", PROTOTYPE_SALT);
    setMasterKey(key);
    refreshNotes(key);
  }, []);

  useEffect(() => {
    syncService.connect();
    syncService.setOnMessage(async (message) => {
      if (message.table === "notes") {
        await NoteService.applyRemoteChange(message.action, message.payload);
        if (masterKey) refreshNotes(masterKey);
      }
    });
  }, [masterKey]);

  const refreshNotes = async (key: Buffer) => {
    try {
      setIsLoading(true);
      const fetchedNotes = await NoteService.getNotes(key);
      setNotes(fetchedNotes);
    } catch (e) {
      console.log("Error fetching notes:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 0. Trash Logic
      if (activeFilter === "TRASH") {
        return !!note.deletedAt;
      }
      if (note.deletedAt) return false;

      // 1. Text Search
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Type Filter
      if (activeFilter === "MEDIA")
        return (note.images && note.images.length > 0) || note.audio;
      if (activeFilter === "DOCS")
        return note.documents && note.documents.length > 0;

      return true; // ALL
    });
  }, [notes, searchQuery, activeFilter]);

  // --- HANDLERS ---
  const handleLock = () => {
    lockVault();
    router.replace("/(decoy)");
  };

  const handleTogglePin = async (noteId: string) => {
    await NoteService.togglePin(noteId);
    if (masterKey) refreshNotes(masterKey);
  };

  const handleDelete = async (noteId: string) => {
    Alert.alert("Delete Note", "Move this note to trash?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await NoteService.softDeleteNote(noteId);
          if (masterKey) refreshNotes(masterKey);
        },
      },
    ]);
  };

  const handleRestore = async (noteId: string) => {
    await NoteService.restoreNote(noteId);
    if (masterKey) refreshNotes(masterKey);
  };

  const handleDeletePermanent = async (noteId: string) => {
    Alert.alert("Delete Permanently", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Forever",
        style: "destructive",
        onPress: async () => {
          await NoteService.deleteNotePermanent(noteId);
          if (masterKey) refreshNotes(masterKey);
        },
      },
    ]);
  };

  const getDaysRemaining = (deletedAt: Date | null) => {
    if (!deletedAt) return 30;
    const now = new Date();
    const deletedDate = new Date(deletedAt);
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  // Audio & File Logic
  async function startRecording() {
    try {
      setInteractionActive(true);
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        setInteractionActive(false);
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setInteractionActive(false);
    } catch (err) {
      setInteractionActive(false);
      Alert.alert("Failed", (err as any).message);
    }
  }
  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      setRecordedAudioUris((prev) => [...prev, uri]);
    }
  }
  async function playSound(uri: string) {
    // If clicking the same item that is playing
    if (playingUri === uri && sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
    }

    // If clicking a different item, unload previous
    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    setPlayingUri(uri);
    setIsPlaying(true);
    await newSound.playAsync();
    newSound.setOnPlaybackStatusUpdate(async (s) => {
      if (s.isLoaded && s.didJustFinish) {
        setIsPlaying(false);
        setPlayingUri(null);
        await newSound.stopAsync();
      }
    });
  }
  const pickImage = async () => {
    setInteractionActive(true);
    // Small delay to ensure state is set before native transition
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Disable editing to preserve original
      quality: 0.8, // Good quality
      base64: false,
      allowsMultipleSelection: true, // Enable multiple selection
    });

    // Increase timeout to ensure app is fully foregrounded
    setTimeout(() => setInteractionActive(false), 2000);

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setSelectedImages((prev) => [...prev, ...newUris]);
    }
  };
  const pickDocument = async () => {
    try {
      setInteractionActive(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true, // Enable multiple selection
      });

      setTimeout(() => setInteractionActive(false), 2000);

      if (!result.canceled) {
        const newDocs = result.assets.map((file) => ({
          uri: file.uri,
          name: file.name,
          mime: file.mimeType,
        }));
        setSelectedDocs((prev) => [...prev, ...newDocs]);
      }
    } catch {
      setInteractionActive(false);
      Alert.alert("Error", "Could not pick file");
    }
  };

  // UPDATED: Robust File Opening with Legacy API
  const openDocument = async (doc: any) => {
    if (!masterKey) return;
    try {
      // 1. Decrypt to temp file
      // Extract extension from original name (e.g., "report.pdf" -> "pdf")
      const extension = doc.name ? doc.name.split(".").pop() : "tmp";

      const tempPath = await StorageService.loadEncryptedFile(
        doc.encryptedPath,
        masterKey,
        true,
        extension // <--- Pass the correct extension here
      );

      if (tempPath) {
        if (Platform.OS === "android") {
          // Android: Try IntentLauncher first (Direct Open)
          try {
            // Using the legacy API to get Content URI
            const contentUri = await getContentUriAsync(tempPath);
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: doc.mime || "*/*",
              }
            );
          } catch (intentError) {
            // Fallback: If Content URI fails, use Sharing
            console.log(
              "IntentLauncher failed, falling back to Sharing:",
              intentError
            );
            await Sharing.shareAsync(tempPath);
          }
        } else {
          // iOS: Sharing handles preview natively
          await Sharing.shareAsync(tempPath);
        }
      } else {
        Alert.alert("Error", "Failed to decrypt file.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not open document: " + (e as any).message);
    }
  };

  const openNewNoteModal = () => {
    setEditingNoteId(null);
    setCurrentNoteTitle("");
    setContent("");
    setSelectedImages([]); // Reset array
    setRecordedAudioUris([]); // Reset array
    setInitialAudioUris([]); // Reset array
    setSelectedDocs([]); // Reset array
    setNoteModalVisible(true);
  };

  const openNote = async (note: any) => {
    setEditingNoteId(note.id);
    setCurrentNoteTitle(note.title);
    setContent(note.content);

    // Initial state from list (contains thumbnail + placeholders)
    setSelectedImages(note.images || []);
    // Load existing audio attachments (if any) or legacy audio
    const existingAudios = note.audio ? note.audio.map((a: any) => a) : [];
    setRecordedAudioUris(existingAudios);
    setInitialAudioUris(existingAudios); // Track initial state

    setSelectedDocs(note.documents || []);

    setNoteModalVisible(true);

    // Fetch full details (decrypt all images) if we have a master key
    if (masterKey) {
      try {
        const details = await NoteService.getNoteDetails(note.id, masterKey);
        if (details.images && details.images.length > 0) {
          setSelectedImages(details.images);
        }
      } catch (e) {
        console.log("Failed to load note details", e);
      }
    }
  };

  const handleSave = async () => {
    if (!masterKey || !currentNoteTitle.trim()) return;
    if (editingNoteId) {
      // Filter out existing audios to avoid duplication
      const newAudioUris = recordedAudioUris.filter(
        (uri) => !initialAudioUris.includes(uri)
      );

      await NoteService.updateNote(
        editingNoteId,
        currentNoteTitle,
        content,
        masterKey,
        undefined, // imageUri (not handled yet)
        newAudioUris // Pass only NEW audios
      );
    } else {
      await NoteService.createNote(
        currentNoteTitle,
        content,
        masterKey,
        selectedImages, // Pass array
        recordedAudioUris, // Pass array
        selectedDocs // Pass array
      );
    }
    setNoteModalVisible(false);
    refreshNotes(masterKey);
  };

  const closeNoteModal = () => {
    setNoteModalVisible(false);
  };

  // Image Viewer State
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageViewerVisible(true);
  };

  // Pattern Dropdown State
  const [isPatternMenuVisible, setPatternMenuVisible] = useState(false);

  const handlePatternSelect = (pattern: string) => {
    console.log("Selected pattern:", pattern);
    setBackgroundPattern(pattern);
    setPatternMenuVisible(false);
  };

  const renderPatternMenu = () => {
    if (!isPatternMenuVisible) return null;
    console.log("Rendering Pattern Menu");
    return (
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 2000 }]} // High zIndex
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setPatternMenuVisible(false)}
        >
          <View
            style={[styles.menuContainer, { top: insets.top + 60, right: 20 }]}
          >
            <Text style={styles.menuTitle}>Choose Theme 🎨</Text>
            {["none", "teddy", "heart", "bow"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.menuItem,
                  backgroundPattern === p && styles.menuItemSelected,
                ]}
                onPress={() => handlePatternSelect(p)}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    backgroundPattern === p && styles.menuItemTextSelected,
                  ]}
                >
                  {p === "none"
                    ? "Plain"
                    : p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
                {backgroundPattern === p && <Check size={16} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <PatternBackground pattern={backgroundPattern}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>My Vault 🔒</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                console.log("Palette button pressed!");
                setPatternMenuVisible(true);
              }}
            >
              <Palette color="#4B5563" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleLock} // <--- Restored handleLock
            >
              <Lock color="#EF4444" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color="#9CA3AF" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {["ALL", "MEDIA", "DOCS", "TRASH"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes Grid */}
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.noteCard}
              onPress={() => openNote(item)}
              disabled={activeFilter === "TRASH"}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                {item.images && item.images.length > 0 ? (
                  <View>
                    <Image
                      source={{ uri: item.images[0] }}
                      style={[
                        styles.thumbnail,
                        activeFilter === "TRASH" && { opacity: 0.5 },
                      ]}
                    />
                    {item.images.length > 1 && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          backgroundColor: "#111827",
                          borderRadius: 10,
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFF",
                            fontSize: 8,
                            fontWeight: "bold",
                          }}
                        >
                          +{item.images.length - 1}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.iconBox,
                      activeFilter === "TRASH" && {
                        backgroundColor: "#F3F4F6",
                      },
                    ]}
                  >
                    {item.documents && item.documents.length > 0 ? (
                      <Paperclip
                        size={24}
                        color={activeFilter === "TRASH" ? "#9CA3AF" : "#10B981"}
                      />
                    ) : item.audio ? (
                      <Mic
                        size={24}
                        color={activeFilter === "TRASH" ? "#9CA3AF" : "#10B981"}
                      />
                    ) : (
                      <FileText
                        size={24}
                        color={activeFilter === "TRASH" ? "#9CA3AF" : "#10B981"}
                      />
                    )}
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={[
                        styles.noteTitle,
                        activeFilter === "TRASH" && {
                          color: "#9CA3AF",
                          textDecorationLine: "line-through",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.isPinned && !item.deletedAt && (
                      <Pin size={12} color="#F59E0B" fill="#F59E0B" />
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                    <Text style={styles.noteDate}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "Just now"}
                    </Text>
                    {item.documents && item.documents.length > 0 && (
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>
                          {item.documents.length > 1
                            ? `${item.documents.length} DOCS`
                            : "DOC"}
                        </Text>
                      </View>
                    )}
                    {activeFilter === "TRASH" && item.deletedAt && (
                      <View
                        style={[
                          styles.tagBadge,
                          { backgroundColor: "#FEE2E2" },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: "#EF4444" }]}>
                          {getDaysRemaining(item.deletedAt)} days left
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* ACTIONS */}
                {activeFilter === "TRASH" ? (
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => handleRestore(item.id)}
                    >
                      <RotateCcw size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => handleDeletePermanent(item.id)}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => handleTogglePin(item.id)}
                    >
                      <Pin
                        size={18}
                        color={item.isPinned ? "#F59E0B" : "#D1D5DB"}
                        fill={item.isPinned ? "#F59E0B" : "transparent"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />

        {activeFilter !== "TRASH" && (
          <TouchableOpacity style={styles.fab} onPress={openNewNoteModal}>
            <Plus size={32} color="#FFF" />
          </TouchableOpacity>
        )}
      </PatternBackground>

      {/* Note Editing Modal */}
      <Modal
        visible={isNoteModalVisible}
        animationType="slide"
        onRequestClose={closeNoteModal}
      >
        <PatternBackground pattern={backgroundPattern}>
          <View
            style={[
              styles.modalContainer,
              { paddingTop: insets.top + 20, paddingHorizontal: 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeNoteModal}>
                <X size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <TextInput
                  style={[styles.titleInput, { color: "#000" }]}
                  placeholder="Title"
                  placeholderTextColor="#9CA3AF"
                  value={currentNoteTitle}
                  onChangeText={setCurrentNoteTitle}
                />

                {/* RICH TEXT EDITOR */}
                <Text style={styles.label}>Content</Text>
                <View style={styles.editorContainer}>
                  <RichToolbar
                    editor={richText}
                    actions={[
                      actions.setBold,
                      actions.setItalic,
                      actions.setUnderline,
                      actions.heading1,
                      actions.insertBulletsList,
                      actions.checkboxList,
                    ]}
                    iconMap={{
                      [actions.heading1]: ({
                        tintColor,
                      }: {
                        tintColor: string;
                      }) => <Text style={[{ color: tintColor }]}>H1</Text>,
                    }}
                    style={styles.toolbar}
                  />
                  <RichEditor
                    ref={richText}
                    initialContentHTML={content}
                    onChange={setContent}
                    placeholder="Secret Content..."
                    style={styles.richEditor}
                    editorStyle={{
                      backgroundColor: "transparent",
                      color: "#000000",
                      placeholderColor: "#9CA3AF",
                    }}
                    initialHeight={150}
                    key={editingNoteId || "new"}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 20,
                    marginTop: 20,
                  }}
                >
                  <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
                    <ImageIcon size={20} color="#666" />
                    <Text style={styles.mediaText}>Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mediaBtn, recording && styles.recordingBtn]}
                    onPress={recording ? stopRecording : startRecording}
                  >
                    {recording ? (
                      <Animated.View
                        style={{
                          opacity: recordingAnim,
                        }}
                      >
                        <StopCircle size={20} color="#FFF" />
                      </Animated.View>
                    ) : (
                      <Mic size={20} color="#666" />
                    )}
                    <Text
                      style={[styles.mediaText, recording && { color: "#FFF" }]}
                    >
                      {recording ? "Recording..." : "Voice"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={pickDocument}
                  >
                    <Paperclip size={20} color="#666" />
                    <Text style={styles.mediaText}>File</Text>
                  </TouchableOpacity>
                </View>

                {/* Previews */}
                {recordedAudioUris.map((uri, index) => (
                  <View key={index} style={styles.audioPreview}>
                    <TouchableOpacity
                      onPress={() => playSound(uri)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor:
                          playingUri === uri && isPlaying
                            ? "#EF4444"
                            : "#2563EB",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      {playingUri === uri && isPlaying ? (
                        <Pause size={20} color="#FFF" />
                      ) : (
                        <Play size={20} color="#FFF" fill="#FFF" />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#333", fontWeight: "bold" }}>
                        Voice Note {index + 1}
                      </Text>
                      <Text style={{ color: "#666", fontSize: 12 }}>
                        {playingUri === uri ? "Playing..." : "Ready to play"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ padding: 8 }}
                      onPress={() => {
                        // Stop if playing this one
                        if (playingUri === uri) {
                          if (sound) sound.unloadAsync();
                          setPlayingUri(null);
                          setIsPlaying(false);
                        }
                        // Remove from array
                        setRecordedAudioUris((prev) =>
                          prev.filter((u) => u !== uri)
                        );
                      }}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* DOCUMENTS LIST */}
                {selectedDocs.map((doc, index) => (
                  <View key={index} style={styles.audioPreview}>
                    <File size={24} color="#2563EB" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        style={{ color: "#333", fontWeight: "bold" }}
                        numberOfLines={1}
                      >
                        {doc.name}
                      </Text>
                      <Text style={{ color: "#666", fontSize: 10 }}>
                        {doc.mime || "Document"}
                      </Text>
                    </View>
                    {editingNoteId ? (
                      <TouchableOpacity
                        onPress={() => openDocument(doc)}
                        style={{
                          padding: 6,
                          backgroundColor: "#EFF6FF",
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#2563EB",
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          OPEN
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedDocs((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        <Trash2 size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* IMAGES LIST */}
                {selectedImages.map((uri, index) => (
                  <View key={index} style={{ marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => openImageViewer(index)}>
                      <Image
                        source={{ uri: uri }}
                        style={{
                          width: "100%",
                          height: 250, // Fixed height
                          borderRadius: 12,
                          backgroundColor: "#f0f0f0",
                        }}
                        resizeMode="contain" // Preserve aspect ratio
                      />
                    </TouchableOpacity>
                    {!editingNoteId && (
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          backgroundColor: "rgba(0,0,0,0.5)",
                          borderRadius: 20,
                          padding: 4,
                        }}
                        onPress={() => {
                          setSelectedImages((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        <X size={16} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </PatternBackground>
      </Modal>

      {/* FULL SCREEN IMAGE VIEWER */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              zIndex: 10,
              padding: 10,
            }}
            onPress={() => setIsImageViewerVisible(false)}
          >
            <X size={30} color="#FFF" />
          </TouchableOpacity>

          <FlatList
            data={selectedImages}
            horizontal
            pagingEnabled
            initialScrollIndex={currentImageIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  width: width,
                  height: "100%",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: item }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
            )}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

      <FunnyLoader visible={isLoading} />
      {renderPatternMenu()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#111827", // Restored black background
  },
  headerTitle: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
  },
  lockText: { color: "#EF4444", fontWeight: "bold", fontSize: 12 },

  // Search & Filter
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: "#10B981" },
  filterText: { fontSize: 12, fontWeight: "bold", color: "#6B7280" },
  filterTextActive: { color: "#FFF" },

  noteCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    maxWidth: 150,
  },
  noteDate: { fontSize: 12, color: "#6B7280" },
  tagBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: "bold", color: "#0284C7" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalContent: { padding: 20 },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  recordingBtn: { backgroundColor: "#EF4444" },
  mediaText: { fontWeight: "600", color: "#666" },
  audioPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6B7280",
    marginBottom: 6,
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  toolbar: { backgroundColor: "#F3F4F6" },
  richEditor: { minHeight: 150 },

  // Pattern Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  menuContainer: {
    position: "absolute",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 8,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000, // <--- Added zIndex
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 8,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemSelected: {
    backgroundColor: "#2563EB",
  },
  menuItemText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  menuItemTextSelected: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

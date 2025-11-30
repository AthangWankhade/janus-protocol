Project Blueprint: The Janus Protocol (QuizBot + Secure Vault)

1. Executive Summary

System Type: Local-First (LoFi) Distributed System
Core Philosophy: "Client is the Source of Truth."
Privacy Model: Zero-Knowledge Architecture (Server never sees unencrypted note data).

The system appears to be a standard AI Study Assistant (The Decoy). It ingests PDFs/Images and generates quizzes. However, upon a specific trigger (Gesture/Passcode), it reveals a Cryptographically Secure Vault for sensitive notes and media.

2. Distributed Service Architecture

Unlike traditional web apps where logic lives on the server, here the logic lives on the Client Node. The server components are stateless utilities.

Node A: The Mobile Client (The "Master Node")

Responsibility: UI, Logic, Local DB, Encryption, Biometrics, Offline ML.

Language/Framework: React Native (TypeScript) with Expo.

Why: Cross-platform, excellent offline support, access to native biometrics and file system.

Node B: The AI Processor Service (The "Brain")

Responsibility: Heavy lifting for Quiz Generation, OCR, and Document Analysis.

Language: Python 3.11

Framework: FastAPI (Async, High Performance).

Key Libraries: LangChain, PyPDF2, OpenAI SDK / Gemini SDK.

Behavior: Stateless. Receives document text -> Returns Quiz JSON -> Forgets data immediately.

Node C: The Sync Relay Service (The "Bridge")

Responsibility: Synchronizing encrypted binary blobs between devices without knowing what they are.

Language: Go (Golang)

Framework: Gin + Gorilla WebSockets.

Why: Go provides massive concurrency for handling thousands of open WebSocket connections for real-time sync.

3. Detailed Technology Stack

3.1 Mobile Client (React Native)

Component

Technology

Description

Local Database

WatermelonDB

Built on SQLite. Lazy-loading. optimized for React.

Encryption

LibSodium (react-native-sodium)

High-speed XSalsa20 encryption for notes/files.

State Mgmt

Zustand

Minimalist state management.

Rich Text

TipTap (WebView)

Headless wrapper for rich text editing.

Biometrics

Expo LocalAuthentication

FaceID/TouchID integration.

3.2 Local Data Structure (WatermelonDB Schema)

vault_items: ID, Encrypted_Content (Blob), IV (Init Vector), Hash, Created_At.

folders: ID, Parent_ID, Encrypted_Name.

quiz_history: ID, Score, Topics, Date. (Unencrypted, part of the decoy).

3.3 Security Implementation (The "Vault")

Key Derivation: The user's PIN/Password is never stored. It is hashed using Argon2id to generate the Master_Encryption_Key.

Encryption at Rest: All notes are encrypted with AES-256-GCM using the Master_Encryption_Key before being saved to SQLite.

Media Storage: Images/PDFs are encrypted as binary blobs and stored in the App Sandbox file system with random filenames.

4. The "Decoy" Workflow (Quiz Bot)

Input: User uploads a PDF to the chat.

Processing: App sends text to AI Processor Service.

Generation: AI generates:

10 MCQs.

2 Short Answer (300 words).

1 Long Answer (1000 words).

Grading: User answers are sent back to AI Processor for grading against the source text.

Analytics: "Study patterns" are saved locally to improve future quiz difficulty.

5. The "Secret" Trigger Mechanism

The app listens for a specific pattern in the Chat Interface:

Method A (Conversational): Typing a specific phrase like "The owl flies at midnight" triggers a seamless UI transition.

Method B (Invisible UX): Long-pressing the "Send" button for 5 seconds triggers the biometric prompt.

6. Sync Protocol (The "Distributed" Part)

We use a simplified Merkle Tree approach.

Offline Edits: User edits a note. The change is marked as status: 'pending_sync'.

Connection: App connects to Sync Relay Service (Go).

Push: App uploads the Encrypted diff.

Conflict Resolution: "Last Write Wins" (LWW) based on high-precision timestamps, OR manual merge if versions diverge significantly.

Pull: Other devices assigned to the same User ID listen via WebSocket and pull the new encrypted blobs.

7. Roadmap & Phases

Phase 1: The Shell: Build the Chat UI and the AI Quiz generation pipeline.

Phase 2: The Core: Implement SQLite/WatermelonDB and the Local Encryption System.

Phase 3: The Switch: Implement the UI transition and Biometric Lock.

Phase 4: Sync: Build the Go Relay server and connect multi-device sync.
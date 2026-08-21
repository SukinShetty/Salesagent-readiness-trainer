# KGIS Sales Coach

Build a client-facing POC called “KGIS Sales Training AI”.

This is an AI-powered voice roleplay and coaching platform for training US telecom sales agents.

Use the ElevenLabs Conversational AI agent below:

Agent name: KGIS AI Telecom Customer

Agent ID: agent_6801kxj68508fhdb7p2hzrqbrerw

Integrate the agent using the recommended ElevenLabs React SDK or embeddable conversational AI widget.

The application must have a polished enterprise design suitable for presenting to KGIS Learning & Development leadership.

For the first version, create these screens:

1. Trainer Dashboard

- Product title: KGIS Sales Training AI

- Subtitle: AI-powered roleplay, coaching and sales readiness evaluation

- Metric cards:

  - Active Trainees: 24

  - Roleplays Completed: 156

  - Average Score: 72%

  - Production Ready: 9

- A trainee table with:

  - Name

  - Batch

  - Last Scenario

  - Score

  - Readiness

  - Start Roleplay button

2. Scenario Library

Create these scenario cards:

- Price-Sensitive Customer

- Skeptical Customer

- Impatient Customer

- Objection-Heavy Customer

- Genuine Buyer

Each card should show:

- Difficulty

- Customer personality

- Focus skills

- Estimated duration

- Start Roleplay button

3. Live Roleplay Screen

This is the main POC screen.

Include:

- Selected trainee information

- Selected scenario information

- A large AI Customer card

- Customer name: Rachel Miller

- Customer profile: US home customer, price-sensitive, works from home, family of four

- Customer mood: Cautious but open

- ElevenLabs voice agent integrated inside this screen

- Start Roleplay button

- End Roleplay button

- Connection status:

  - Ready

  - Connecting

  - Listening

  - Speaking

  - Completed

- Animated audio waveform

- Transcript panel

- Use Demo Transcript button

- Generate Evaluation button

4. Evaluation Report

Show:

- Overall score

- Readiness level

- Certification decision

- Category scores:

  - Opening and Verification

  - Discovery and Fact Finding

  - Product Recommendation and FBB

  - Objection Handling

  - Compliance and Ethical Selling

  - Closing and Recap

  - Soft Skills

- Strengths

- Missed expectations

- Coaching feedback

- Recommended next scenario

Use mock data for the dashboard and evaluation report initially.

The app must still work if automatic transcript capture is not available. Keep the transcript box editable so a transcript can be pasted manually.

Design requirements:

- Premium enterprise SaaS appearance

- Light background

- Deep blue and subtle teal accents

- Clean typography

- Rounded cards

- Professional layout

- Not playful

- Do not add login yet

- Do not build advanced admin functionality yet

Prioritize getting the ElevenLabs voice roleplay working inside the Live Roleplay screen.
# Deploy ElevenLabs Conversational AI Agent

Agent name: KGIS AI Telecom Customer
Agent ID: agent_6801kxj68508fhdb7p2hzrqbrerw

> Recommended for Lovable: Use the React SDK (@elevenlabs/react) or the embeddable widget (@elevenlabs/convai-widget) for the fastest integration.

## Integration Methods

### 1. React SDK (@elevenlabs/react)

npm install @elevenlabs/react

import { useConversation } from "@elevenlabs/react";

function Agent() {
  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onMessage: (message) => console.log("Message:", message),
    onError: (error) => console.error("Error:", error),
    onModeChange: (mode) => console.log("Mode:", mode),
  });

  const startConversation = async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    await conversation.startSession({
      agentId: "agent_6801kxj68508fhdb7p2hzrqbrerw",
      connectionType: "webrtc", // or "websocket"
    });
  };

  return (
    


      Start
       conversation.endSession()}>Stop
      

Status: {conversation.status}


      

Agent is {conversation.isSpeaking ? "speaking" : "listening"}


    


  );
}

Key features:
- connectionType: "webrtc" (recommended, lower latency) or "websocket"
- conversation.sendUserMessage(text) — send text messages to the agent
- conversation.sendContextualUpdate(text) — send context without triggering a response
- conversation.sendFeedback(true/false) — provide conversation feedback
- conversation.sendUserActivity() — signal user activity to prevent interruptions
- conversation.setVolume({ volume: 0.5 }) — adjust output volume
- conversation.getInputVolume() / getOutputVolume() — get current audio levels
- Client tools: define clientTools in options to let the agent invoke client-side functions
- Overrides: customize prompt, firstMessage, language, voiceId via overrides option

### 2. React Native SDK (@elevenlabs/react-native)

npm install @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc livekit-client

Wrap your app with the provider:

import { ElevenLabsProvider, useConversation } from "@elevenlabs/react-native";

function App() {
  return (
    <ElevenLabsProvider>
      <ConversationScreen />
    </ElevenLabsProvider>
  );
}

function ConversationScreen() {
  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onMessage: (message) => console.log("Message:", message),
    onError: (error) => console.error("Error:", error),
  });

  const start = async () => {
    await conversation.startSession({ agentId: "agent_6801kxj68508fhdb7p2hzrqbrerw" });
  };

  return (
    <View>
      <Button title={conversation.status === "connected" ? "Stop" : "Start"}
        onPress={conversation.status === "connected" ? () => conversation.endSession() : start}
      />
      <Text>Agent is {conversation.isSpeaking ? "speaking" : "listening"}</Text>
    </View>
  );
}

Note: Requires Expo development builds (not compatible with Expo Go). Configure microphone permissions in Info.plist (iOS) and AndroidManifest.xml (Android).

### 3. Embeddable Widget (@elevenlabs/convai-widget)

npm install @elevenlabs/convai-widget

import "@elevenlabs/convai-widget";

function App() {
  return <elevenlabs-convai agent-id="agent_6801kxj68508fhdb7p2hzrqbrerw"></elevenlabs-convai>;
}

Or use the CDN directly in HTML:

<script src="https://elevenlabs.io/convai-widget/index.js" async></script>
<elevenlabs-convai agent-id="agent_6801kxj68508fhdb7p2hzrqbrerw"></elevenlabs-convai>

### 4. Python SDK (elevenlabs)

pip install "elevenlabs[pyaudio]"

Note: pyaudio may require system dependencies — on macOS: brew install portaudio, on Debian/Ubuntu: sudo apt-get install libportaudio2 portaudio19-dev

import os
import signal
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

conversation = Conversation(
    client,
    agent_id="agent_6801kxj68508fhdb7p2hzrqbrerw",
    requires_auth=False,
    audio_interface=DefaultAudioInterface(),
    callback_agent_response=lambda response: print(f"Agent: {response}"),
    callback_agent_response_correction=lambda original, corrected: print(f"Agent: {original} -> {corrected}"),
    callback_user_transcript=lambda transcript: print(f"User: {transcript}"),
)

conversation.start_session()
signal.signal(signal.SIGINT, lambda sig, frame: conversation.end_session())
conversation_id = conversation.wait_for_session_end()
print(f"Conversation ID: {conversation_id}")

### 5. Direct WebSocket

Endpoint: wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_6801kxj68508fhdb7p2hzrqbrerw

const ws = new WebSocket(
  "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_6801kxj68508fhdb7p2hzrqbrerw"
);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "conversation_initiation_client_data",
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "user_transcript":
      console.log("User:", data.user_transcription_event.user_transcript);
      break;
    case "agent_response":
      console.log("Agent:", data.agent_response_event.agent_response);
      break;
    case "audio":
      // data.audio_event.audio_base_64 contains the audio chunk
      // data.audio_event.alignment contains character-level timing
      break;
    case "ping":
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event.event_id,
        }));
      }, data.ping_event.ping_ms);
      break;
  }
};

// Send audio chunks as base64-encoded messages:
// ws.send(JSON.stringify({ user_audio_chunk: base64AudioData }));

// Send contextual updates (non-interrupting):
// ws.send(JSON.stringify({ type: "contextual_update", text: "User clicked pricing page" }));

### 6. WebRTC

For low-latency, production-grade voice conversations, obtain a conversation token server-side:

// Server-side
const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_6801kxj68508fhdb7p2hzrqbrerw`,
  { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }
);
const { token } = await response.json();

Then use the token with any ElevenLabs client SDK that supports WebRTC:
- React: conversation.startSession({ conversationToken: token, connectionType: "webrtc" })
- React Native: conversation.startSession({ conversationToken: token })
- Also available for Kotlin, Flutter, and Swift SDKs

## Documentation & API Reference

- Full documentation: https://elevenlabs.io/docs/eleven-agents
- API reference: https://elevenlabs.io/docs/api-reference/introduction
- Agents API: https://elevenlabs.io/docs/api-reference/agents/get
- Conversations API: https://elevenlabs.io/docs/api-reference/conversations/get

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://agent-readiness-trainer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/285c8638-29d1-466a-a69e-7898e90233c5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

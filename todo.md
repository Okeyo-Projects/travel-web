# TODO — Bug Investigation

Investigation date: 2026-07-08

## Guide Item / Experience Modal Image Viewer Behind Modal

- [x] **Status: Done**
- **Symptom:** Opening the image viewer from inside a guide item or experience modal shows the viewer behind the modal.
- **Likely cause:** `ImageViewer` portals to `document.body`, but its root is only `z-[100]` and controls are `z-[101]` in `src/components/ui/image-viewer.tsx`. Shared Radix dialog overlay/content use `z-[140]` in `src/components/ui/dialog.tsx`, so the modal stays above the viewer.
- **Fix:** Raised the image viewer overlay and controls above all app dialogs/sheets in `src/components/ui/image-viewer.tsx` (`z-[200]` / `z-[201]`). Also verify body scroll locking still restores correctly when a dialog and image viewer are nested.
- **Files to inspect/edit:** `src/components/ui/image-viewer.tsx`, `src/components/ui/dialog.tsx`, any guide/experience modal that opens `useImageViewer`.
- **Verification:** From an open guide item / experience modal, click a gallery image and confirm the viewer covers the whole viewport, close button works, Escape closes the viewer first, and the underlying modal remains usable afterward.

## Guide Item Card Shows Image In The Video Strip

- [x] **Status: Done**
- **Symptom:** In the guide item card, the first "video" slot appears as an image.
- **Likely cause:** `src/components/chat/GuideItemCard.tsx` renders `heroImageSrc` before `allVideos` in the same horizontal media strip. This makes the first media tile an image even when the user expects this area to show videos only. The video component already tries to reveal the first video frame, so no separate thumbnail is needed.
- **Fix:** Split media responsibilities in `src/components/chat/GuideItemCard.tsx`: the top strip now renders only when `allVideos.length > 0`, and it maps only actual video URLs. Hero images no longer appear in the video strip, and `InlineGuideItemVideoCard` still uses the video element's first frame instead of separate poster thumbnails.
- **Files to inspect/edit:** `src/components/chat/GuideItemCard.tsx`, `src/components/chat/GuideItemCardsGrid.tsx`, `src/app/preview/guide-item-card/page.tsx`.
- **Verification:** Preview a guide item with both `hero_image_url` and `video_url`; the video strip starts with an actual playable video. Preview a guide item with images but no videos; the UI should not label or position the image as a video.

## Weather API Tool Accuracy

- [x] **Status: Done**
- **Symptom:** Need the AI to answer weather questions accurately with live data.
- **Current finding:** A `getWeather` tool already exists in `src/lib/ai/tools/get-weather.ts` and is registered in `src/app/api/ai/chat/route.ts`. It uses Open-Meteo geocoding and forecast APIs. Open-Meteo is a good default because the forecast endpoint accepts latitude/longitude and weather variables, returns JSON, supports current/daily forecast data, and the geocoding docs say an API key is only required for commercial reserved resources. Docs: `https://open-meteo.com/en/docs`, `https://open-meteo.com/en/docs/geocoding-api`.
- **Likely cause:** The bug may be configuration/prompting rather than missing code: active DB `enabled_tools` may omit `getWeather`, the system prompt may not strongly require tool use for weather, or responses may use static `getTopicInformation` climate guidance instead of live forecast data.
- **Fix:** Forced `getWeather` into the runtime enabled-tool compatibility set and injected a live weather rule in `src/app/api/ai/chat/route.ts`, so current weather, rain, temperature, wind, or forecast requests must call `getWeather` before answering. Optional fallback providers: WeatherAPI free plan has 100K calls/month but requires an API key; weather.gov is free/public-domain oriented but US-only and requires a User-Agent, so it is not suitable as the global Morocco default.
- **Files to inspect/edit:** `src/lib/ai/tools/get-weather.ts`, `src/lib/ai/agent-config.ts`, `src/lib/ai/system-prompt.ts`, `src/app/api/ai/chat/route.ts`, `supabase/scripts/seed_ai_agent_config_booking_agent.sql`, agent config migrations.
- **Verification:** Ask the AI "weather in Marrakech tomorrow" and confirm network tool output is used, dates are explicit, and the response includes current/forecast data from `getWeather`.

## Guide Item Distance Is Incorrect / Location Not Shared With AI

- [x] **Status: Done**
- **Symptom:** Distance shown on guide item cards is not correct, and the AI may not know the user's real location even after permission is granted.
- **Likely cause:** The card uses `useGeoDistance()` local component state in `src/components/chat/GuideItemCard.tsx`, while chat requests use `ChatContext.userLocation` in `src/components/chat/BookingChat.tsx` and inject it into the AI prompt in `src/app/api/ai/chat/route.ts`. Granting location from a guide item card does not update `ChatContext`, so the distance and AI context can drift. The hook also uses `enableHighAccuracy: false` and only computes distance after its own request.
- **Fix:** Updated `useGeoDistance` to read/write `ChatContext.userLocation` when available, keep a local fallback for preview/non-chat usage, use high-accuracy geolocation, and expose the shared coordinates to guide item cards. Chat requests already send `userLocation` into the AI route, and the runtime prompt tells the model to use those coordinates for distance-based searches.
- **Files to inspect/edit:** `src/hooks/use-geo-distance.ts`, `src/contexts/ChatContext.tsx`, `src/components/chat/GuideItemCard.tsx`, `src/components/chat/LocationRequest.tsx`, `src/components/chat/BookingChat.tsx`, `src/lib/ai/tools/plan-trip-with-guide-items.ts`.
- **Verification:** Grant location once from chat or a card, then confirm all guide item cards show distance without asking again and the next AI request includes `userLocation`.

## Follow-Up Chat Messages Do Not Send Or AI Does Not Reply

- [x] **Status: Done**
- **Symptom:** Second and later chat messages sometimes appear not sent, or the AI does not reply.
- **Likely cause:** `sendUserMessage` intentionally returns early while `isLoading`, `isCreatingConversation`, `isSendingRef.current`, or duplicate `inFlightTextRef` are active in `src/components/chat/BookingChat.tsx`. This blocks follow-up messages during streaming without visible feedback. A secondary risk is persistence state: user messages are saved asynchronously after conversation creation, and failed saves only clear `persistingMessageIds` without user-visible recovery.
- **Fix:** Added a one-message follow-up queue in `src/components/chat/BookingChat.tsx`. While the assistant is responding, typed submissions are stored, the input clears, and the queued message sends automatically when the current response reaches `ready`. `ChatInput` now shows responding/queued status text and no longer disables the send action solely because the assistant is streaming.
- **Files to inspect/edit:** `src/components/chat/BookingChat.tsx`, `src/components/chat/ChatInput.tsx`, `src/hooks/use-conversations.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/conversations/[id]/messages/route.ts`.
- **Verification:** Send a message, try another while the AI is streaming, and confirm the UI either blocks with a clear state or queues it. Then send multiple follow-ups after each response and confirm every message produces either an AI response or a visible error.

## Menu Images In Guide Item Modal Do Not Trigger Viewer

- [x] **Status: Done**
- **Symptom:** Menu images in the guide item modal do not open the image viewer.
- **Current finding:** The chat guide item card already wraps `menuImages` in buttons and calls `openImageViewer(menuImages, i, menuImageAlts)`. If this fails only inside a modal, it is probably the same z-index issue as the first bug, making the viewer open behind the modal. If it fails everywhere, check whether `menu_image_urls` are populated/mapped for that item.
- **Fix:** The image viewer z-index was raised above modal layers, and gallery/menu image buttons now call `preventDefault` / `stopPropagation` before opening the viewer so parent modal/card handlers cannot intercept the click.
- **Files to inspect/edit:** `src/components/chat/GuideItemCard.tsx`, `src/hooks/use-image-viewer.tsx`, `src/components/ui/image-viewer.tsx`, `src/lib/guide-items.ts`, `src/lib/guide-items-search.ts`, `src/app/api/guide-items/[id]/route.ts`.
- **Verification:** Open a guide item with `menu_image_urls` inside the modal, click each menu image, and confirm the viewer opens above the modal at the correct index.

## Interleave AI Commentary With Each Guide Item Card

- [x] **Status: Done**
- **Symptom:** When the AI sends guide items, it currently sends text first, then the UI displays the full guide item list. Desired behavior is text about one guide item, then that item's card, repeated for the rest.
- **Likely cause:** `MessageList.extractAssistantBlocks` turns a `tool-searchGuideItems` result into one `guide_item_cards` UI block containing all items. After-message UI blocks are then rendered after text, so there is no per-item interleaving contract.
- **Fix:** Updated `GuideItemCardsGrid` to render each guide item as an item-specific context line followed immediately by that item's card. The context is derived from the saved card payload (`title`, localized `summary`, price, rating), so restored conversations preserve the same interleaved order.
- **Files to inspect/edit:** `src/components/chat/MessageList.tsx`, `src/components/chat/GuideItemCardsGrid.tsx`, `src/components/chat/GuideItemCard.tsx`, `src/lib/ai/tools/search-guide-items.ts`, `src/lib/ai/system-prompt.ts`.
- **Verification:** Ask for three restaurant recommendations and confirm the rendered order is: rationale for item 1, card 1, rationale for item 2, card 2, rationale for item 3, card 3. Confirm saved/restored conversations preserve the same order.

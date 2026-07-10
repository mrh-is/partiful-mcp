# Partiful API Endpoints

Discovered July 2026 by intercepting `fetch()` calls on partiful.com. All endpoints are Firebase Cloud Functions at `https://api.partiful.com/<functionName>`, using POST with a standard request envelope:

```
POST https://api.partiful.com/<functionName>
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{"data": {"params": {<endpoint-specific>}, "userId": "<firebase-uid>"}}
```

Responses follow `{"result": {"data": {<payload>}}}`.

## Event lists

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getMyRsvps` | `{}` | All events the user has been invited to or RSVPed to. Richest event data — includes title, dates, location, guest counts, RSVP status, image metadata, display settings. |
| `getPublishedEvents` | `{userId}` | Events the user is hosting. Responds with a bare array, unlike the other list endpoints here. (Was guessed as `getHostedEvents` — that 404s; see "Verifying against the real client" below.) |
| `getMyUpcomingEventsForHomePage` | `{}` | Upcoming events for the home page. |
| `getMyPastEventsForHomePage` | `{}` | Past events (home page "All past events" tab). |
| `getDiscoverableEvents` | `{}` | Open invite / discoverable events (home page "Open invite" tab). |
| `getMySavedEvents` | `{}` | User's saved/bookmarked events. |
| `getMyFollowedEvents` | `{}` | Events the user is following. |

## Event details

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getEventInfo` | `{eventId, useCache?, password?, currentAppVersion?}` | Individual event details, as `{event, passwordRequired}`. The real replacement for the old `getEvent` (which 404s) — confirmed via bundle-grep call-site context. Works for any viewable event, not just ones in the user's RSVP list, but the response has no per-user RSVP/guest field the way `getMyRsvps` entries do. |
| `getGuests` | `{eventId}` | Full guest list for an event. |
| `getMutualGuests` | `{eventId}` | Guests in common between the current user and a specific event, as `{totalCount, guests}`. |
| `getEventComments` | `{eventId}` | Comments/discussion on an event. |
| `getEventMedia` | `{eventId}` | Photos and media uploaded to an event. |
| `getEventRestrictions` | `{eventId}` | Event restrictions (age, capacity, etc.). |
| `getEventPermission` | `{eventId}` | Current user's permissions for this event. |
| `getEventDisplayedHostMessages` | `{eventId}` | Host messages displayed on the event page. |
| `getEventTicketingEligibility` | `{eventId}` | Whether the event supports ticketing. |
| `getPendingCohostRequestForEvent` | `{eventId}` | Pending cohost invitations for the event. |

## Host-specific

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getHostPromoCodes` | `{eventId}` | Promo codes for a hosted event. |
| `getHostTicketTypes` | `{eventId, includeDisabled: true}` | Ticket types/tiers for a hosted event. |
| `getTicketFeeConfig` | `{eventId?}` | Ticketing fee configuration (flat fee, fee rate) for an event, or the platform default. Confirmed live: `{flatFee, feeRate, isCustomFee}`. |
| `getTicketsForEvent` | `{eventId}` | All tickets sold for a ticketed event. 403s for non-hosts — response shape unconfirmed beyond that (see README "Host-only ticketing/payment tools"). |
| `getTicketsForTicketType` | `{eventId, ticketTypeId}` | Tickets sold for one ticket type. 403s for non-hosts — response shape unconfirmed. |
| `getGuestPaymentInfo` | `{eventId, purchaserUserId}` | Payment history for one guest's ticket purchases, as `{payments: [{ticketOrderId, createdAt, ticketCount, amountCharged, feesTotal, taxTotal, currency, promoCodes}]}` (fields from call-site context; 403s for non-hosts so not live-verified). |
| `getPayoutSummaryForEvent` | `{eventId}` | Host payout summary for a ticketed event. 403s for non-hosts — response shape unconfirmed. |
| `getEventDiscoverStatus` | `{eventId}` | Whether the event is listed on explore/discover. |
| `getEventDiscoverInfo` | `{eventId}` | Discover-page info for an event, as `{region, sections, tags}` (all nullable). |
| `getDiscoverCurationOptions` | `{eventId}` | Host-side discover-page curation settings. 403s for non-hosts — response shape unconfirmed. |
| `getCohostRequestedEvents` | `{}` | Events where user has been asked to cohost. |
| `getAllEventRestrictions` | `{}` | All restrictions across user's events. |
| `getContactsFilteredByEvent` | `{eventId}` | Contacts that can be invited to a specific event. Does not paginate. (Was guessed as `getInvitableContacts` with `{eventId, skip, limit}` — that 404s; see "Verifying against the real client" below.) |

## Users and social

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getUsers` | `{ids: [...], includePartyStats: bool}` | User profiles by ID. Called frequently with batches of IDs. |
| `getUsersPartyStats` | `{userIds: [...]}` | Party stats (attended count, hosted count) for user profiles. |
| `getMutuals` | `{}` | Mutual connections (people you've been at the same events with). |
| `getFollowers` | `{}` | The current user's followers, as `{users: [...]}`. |
| `getFollowing` | `{}` | User IDs the current user follows, as `{userIds: [...]}`. |
| `getContacts` | `{}` | User's contact list. |
| `getMyCommunities` | `{}` | User's communities. |
| `getCreatedCards` | `{}` | Digital cards the user has created. |
| `getLastQuestionnaireAnswers` | `{}` | The current user's most recent RSVP questionnaire answers, as `{shortAnswer}` — exact shape of `shortAnswer` unconfirmed (empty for accounts with no answers on record). |

## Explore / discover

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getDiscoverEventItemDecorators` | `{eventIds: [...]}` | Decorators/metadata for explore page event cards. |

## Write endpoints (observed)

| Endpoint | Params | Description |
|----------|--------|-------------|
| `markAllNotificationsForEventAsRead` | `{eventId}` | Marks all notifications for an event as read. |

## Verifying against the real client

Two endpoints above (`getPublishedEvents`, `getContactsFilteredByEvent`) were originally guessed by naming convention rather than confirmed, and both 404d in production. The reliable way to get a real endpoint name and its exact param shape: download the public Next.js JS bundles served with any Partiful page (event page, home page, etc. — no login required, they're static assets) and grep them for the Cloud Function name as a string literal. Minified JS still keeps these as bare strings (e.g. `let el="getPublishedEvents"`) because they're used as runtime dictionary keys, not identifiers — they survive minification/mangling even though every variable name around them doesn't.

`./discover-endpoints.sh <page-url> [filter]` in this directory automates the fetch-chunks-and-grep step. It lists every `get*`/`post*`/`mark*`/`set*`/`create*`/`delete*`/`update*`/`remove*`/`add*` string literal found — some of these are library/framework internals (`addEventListener`, `getClientRect`), so confirm a candidate before using it by grepping its surrounding context for the fetch wrapper call site (`(0, X.wF)(candidateName, {params: {...}})` in this codebase's bundle) — that also tells you the real params object.

Before wiring a guessed endpoint name into a tool, run this against a live page and confirm the name and params rather than trusting the naming convention alone.

## Confirmed real, but not wired up (param shape unresolved)

Two endpoints came back from bundle-grep as genuinely real (they're called via the fetch wrapper elsewhere in the app) but every param shape tried against them live failed, so no tool was built for them rather than risk shipping another guess:

- `getMutual` — likely mutual-connections-with-one-other-user (singular counterpart to `getMutuals`); `{userId}`, `{targetUserId}`, and `{otherUserId}` all returned 400 Bad Request.
- `getUserRestrictions` — returns `.isRestricted`; `{userId}`, `{eventId, userId}`, and `{targetUserId}` all returned 500 Internal Server Error (ambiguous — could be wrong shape or an account-specific server bug).

Two more looked plausible from context but failed outright when tried live and were also skipped:

- `getPartyCart` — bundle call site is `{eventId}`, gated behind an `isPartyCartEnabled` feature flag client-side; live-tried with `{eventId}` on a flag-disabled event and got 404, so it's unclear whether the function is actually deployed or just unreachable for this account's events.
- `getEventRecommendedDiscoverSection` — bundle call site is `{eventId}`, but the surrounding code destructures both `.data` and `.paging` off the raw response (a different envelope pattern than every other endpoint here), and live-trying `{eventId}` alone got 400 Bad Request — probably needs an additional pagination param not yet identified.

If you pick one of these up, use `discover-endpoints.sh` against a page that actually exercises the feature (e.g. an event with `isPartyCartEnabled` for `getPartyCart`) rather than guessing again.

## Not yet discovered

Write endpoints for RSVP, create/edit event, send invites, and upload photos were not directly observed by intercepting fetch() calls, but the bundle-grep technique above surfaces plausible candidates without needing to perform the actions (e.g. `createEvent`, `deleteEvent`, `addGuest`, `createComment`, `createTicketType`, `createPromoCode`, `createCohostRequest`, `addInvitedGuestsAsGuest`/`addInvitedGuestsAsHost`) — their exact param shapes still need confirming via call-site context before any tool is built against them. Notifications and profile settings appear to use Firestore directly rather than Cloud Functions.

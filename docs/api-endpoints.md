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
| `getHostedEvents` | `{}` | Events the user is hosting. |
| `getMyUpcomingEventsForHomePage` | `{}` | Upcoming events for the home page. |
| `getMyPastEventsForHomePage` | `{}` | Past events (home page "All past events" tab). |
| `getDiscoverableEvents` | `{}` | Open invite / discoverable events (home page "Open invite" tab). |
| `getMySavedEvents` | `{}` | User's saved/bookmarked events. |
| `getMyFollowedEvents` | `{}` | Events the user is following. |

## Event details

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getEventInfo` | _unclear_ | Individual event details. May be the replacement for the old `getEvent` (which 404s). |
| `getGuests` | `{eventId}` | Full guest list for an event. |
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
| `getEventDiscoverStatus` | `{eventId}` | Whether the event is listed on explore/discover. |
| `getCohostRequestedEvents` | `{}` | Events where user has been asked to cohost. |
| `getAllEventRestrictions` | `{}` | All restrictions across user's events. |
| `getInvitableContacts` | `{eventId, skip, limit}` | Contacts that can be invited to a specific event. |

## Users and social

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getUsers` | `{ids: [...], includePartyStats: bool}` | User profiles by ID. Called frequently with batches of IDs. |
| `getUsersPartyStats` | `{userIds: [...]}` | Party stats (attended count, hosted count) for user profiles. |
| `getMutuals` | `{}` | Mutual connections (people you've been at the same events with). |
| `getContacts` | `{}` | User's contact list. |
| `getMyCommunities` | `{}` | User's communities. |
| `getCreatedCards` | `{}` | Digital cards the user has created. |

## Explore / discover

| Endpoint | Params | Description |
|----------|--------|-------------|
| `getDiscoverEventItemDecorators` | `{eventIds: [...]}` | Decorators/metadata for explore page event cards. |

## Write endpoints (observed)

| Endpoint | Params | Description |
|----------|--------|-------------|
| `markAllNotificationsForEventAsRead` | `{eventId}` | Marks all notifications for an event as read. |

## Not yet discovered

Write endpoints for RSVP, create/edit event, send invites, and upload photos were not observed — discovering them would require actually performing those actions. Notifications and profile settings appear to use Firestore directly rather than Cloud Functions.

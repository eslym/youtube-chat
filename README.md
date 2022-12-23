# youtube-chat
> Fetch YouTube live chat without API

☢ ***You will need to take full responsibility for your action*** ☢

**This is a fork of https://github.com/LinaTsukusu/youtube-chat, please check it out**.
This fork modified a lot of code and data structures, especially how the data be transformed.

## Getting started
1. Install
    - `npm i @eslym/youtube-chat`
    - `yarn add @eslym/youtube-chat`
2. Import
    - Javascript
    ```javascript
    const { LiveChat } = require("youtube-chat")
    ```
    - Typescript
    ```typescript
    import { LiveChat } from "youtube-chat"
    ```
3. Create instance with ChannelID or LiveID
    ```javascript
    // If channelId is specified, liveId in the current stream is automatically acquired.
    // Recommended
    const liveChat = new LiveChat({channelId: "CHANNEL_ID_HERE"})
    
    // Or specify LiveID in Stream manually.
    const liveChat = new LiveChat({liveId: "LIVE_ID_HERE"})
    ```
4. Add events
    ```typescript
    // Emit at start of observation chat.
    // liveId: string
    liveChat.on("start", (liveId) => {
      /* Your code here! */
    })
   
    // Emit at end of observation chat.
    // reason: string?
    liveChat.on("end", (reason) => {
      /* Your code here! */
    })
    
    // Emit at receive chat.
    // chat: ChatItem
    liveChat.on("chat", (chatItem) => {
      /* Your code here! */
    })
    
    // Emit when an error occurs
    // err: Error or any
    liveChat.on("error", (err) => {
      /* Your code here! */
    })
    ```
5. Start
    ```typescript
    // Start fetch loop
    const ok = await liveChat.start()
    if (!ok) {
      console.log("Failed to start, check emitted error")
    }
    ```
6. Stop loop
   ```typescript
   liveChat.stop()
   ```

## Types
### ChatItem
```typescript
export type ChatItemTypes =
        'message'
        | 'superchat'
        | 'supersticker'
        | 'membership-join'
        | 'membership-milestone'
        | 'membership-gift'
        | 'membership-redeem';

interface BaseChatItem {
   id: string

   type: ChatItemTypes

   author: {
      name: string
      thumbnail?: ImageItem
      channelId: string
      badge?: {
         thumbnail: ImageItem
         label: string
      }
   }
   isMembership: boolean
   isVerified: boolean
   isOwner: boolean
   isModerator: boolean
   timestamp: Date
}

export type ChatItem =
        MessageChatItem
        | SuperchatChatItem
        | SuperstickerChatItem
        | MembershipJoinChatItem
        | MembershipMilestoneChatItem
        | MembershipGiftChatItem
        | MembershipRedeemChatItem;

export interface MessageChatItem extends BaseChatItem {
   type: 'message';
   message: MessageItem[]
}

export interface SuperchatChatItem extends BaseChatItem {
   type: 'superchat';
   message: MessageItem[]
   superchat: {
      amount: string
      color: string
   }
}

export interface SuperstickerChatItem extends BaseChatItem {
   type: 'supersticker';
   superchat: {
      amount: string
      color: string
      sticker: ImageItem
   }
}

export interface MembershipJoinChatItem extends BaseChatItem {
   type: 'membership-join';
   joinMessage: MessageItem[];
}

export interface MembershipMilestoneChatItem extends BaseChatItem {
   type: 'membership-milestone';
   message: MessageItem[];
   milestoneMessage: MessageItem[];
}

export interface MembershipGiftChatItem extends BaseChatItem {
   type: 'membership-gift';
   giftMessage: MessageItem[];
}

export interface MembershipRedeemChatItem extends BaseChatItem {
   type: 'membership-redeem';
   redeemMessage: MessageItem[];
}

```

### MessageItem

```typescript
type MessageItem = { text: string } | EmojiItem
```

### ImageItem
```typescript
interface ImageItem {
  url: string
  alt: string
}
```

### EmojiItem
```typescript
interface EmojiItem extends ImageItem {
  emojiText: string
  isCustomEmoji: boolean
}
```

## References
- https://drroot.page/wp/?p=227
- https://github.com/taizan-hokuto/pytchat

Thank you!👍

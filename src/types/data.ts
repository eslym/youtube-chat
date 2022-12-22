/** 整形後の型 */

export type ChatItemTypes =
    'message'
    | 'superchat'
    | 'supersticker'
    | 'membership-join'
    | 'membership-milestone'
    | 'membership-gift'
    | 'membership-redeem';

/** 取得したチャット詳細 */
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
    message: MessageItem[]
}

export interface MembershipGiftChatItem extends BaseChatItem {
    type: 'membership-gift';
    giftMessage: MessageItem[];
}

export interface MembershipRedeemChatItem extends BaseChatItem {
    type: 'membership-redeem';
    redeemMessage: MessageItem[];
}

/** チャットメッセージの文字列or絵文字 */
export type MessageItem = { text: string } | EmojiItem

/** 画像 */
export interface ImageItem {
    url: string
    alt: string
}

/** Emoji */
export interface EmojiItem extends ImageItem {
    emojiText: string
    isCustomEmoji: boolean
}

export type YoutubeId = { channelId: string } | { liveId: string } | { handle: string }

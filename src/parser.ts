import {
    Action,
    FetchOptions,
    GetLiveChatResponse,
    MessageRendererBase,
    MessageRun,
    Thumbnail,
} from "./types/yt-response"
import {
    ChatItem,
    ChatItemTypes,
    ImageItem, MembershipGiftChatItem, MembershipJoinChatItem, MembershipMilestoneChatItem, MembershipRedeemChatItem,
    MessageChatItem,
    MessageItem,
    SuperchatChatItem,
    SuperstickerChatItem
} from "./types/data"
import {parse} from "json5";
import {ChatEndedError} from "./live-chat";

export function getOptionsFromLivePage(data: string): FetchOptions & { liveId: string, title: string } {
    let liveId: string
    const idResult = data.match(/<link rel="canonical" href="https:\/\/www.youtube.com\/watch\?v=(.+?)">/)
    if (idResult) {
        liveId = idResult[1]
    } else {
        throw new Error("Live Stream was not found")
    }

    const titleResult = data.match(/<title>(.+?) - YouTube<\/title>/);
    let title: string;
    if (titleResult) {
        title = titleResult[1];
    } else {
        title = 'Unknown Stream';
    }

    const replayResult = data.match(/['"]isReplay['"]:\s*(true)/)
    if (replayResult) {
        throw new Error(`${liveId} is finished live`)
    }

    let apiKey: string
    const keyResult = data.match(/['"]INNERTUBE_API_KEY['"]:\s*['"](.+?)['"]/)
    if (keyResult) {
        apiKey = keyResult[1]
    } else {
        throw new Error("API Key was not found")
    }

    let clientVersion: string
    const verResult = data.match(/['"]clientVersion['"]:\s*['"]([\d.]+?)['"]/)
    if (verResult) {
        clientVersion = verResult[1]
    } else {
        throw new Error("Client Version was not found")
    }

    let continuation: string
    // explanation on https://github.com/LinaTsukusu/youtube-chat/issues/80#issuecomment-1361011064
    let src = data.slice(data.indexOf('viewSelector'));
    let regex = /[{}]/g;
    let matches = src.matchAll(regex);
    let open = 1;
    let match: IteratorResult<RegExpMatchArray, undefined> = matches.next();
    if (match.done || match.value[0] !== '{') {
        throw new Error("Failed to extract fetch options");
    }
    let start = match.value.index as number;
    let end = start;
    match = matches.next();
    while (!match.done && open > 0) {
        if (match.value[0] === '{') {
            open++;
        } else {
            open--;
        }
        end = match.value.index as number;
        match = matches.next();
    }

    try {
        let vsData = parse(src.slice(start, end + 1));
        continuation = (vsData.sortFilterSubMenuRenderer.subMenuItems as any[])
            .filter(v => !v.selected)[0].continuation.reloadContinuationData.continuation;
    } catch (_) {
        throw new Error("Failed to extract fetch options");
    }

    return {
        title,
        liveId,
        apiKey,
        clientVersion,
        continuation,
    }
}

/** get_live_chat レスポンスを変換 */
export function parseChatData(data: GetLiveChatResponse): [ChatItem[], string] {
    let chatItems: ChatItem[] = []

    if (!data.continuationContents?.liveChatContinuation) {
        throw ChatEndedError;
    }

    if (data.continuationContents.liveChatContinuation.actions) {
        chatItems = data.continuationContents.liveChatContinuation.actions
            .map((v) => parseActionToChatItem(v))
            .filter((v): v is NonNullable<ChatItem> => v !== null)
    }

    const continuationData = data.continuationContents.liveChatContinuation.continuations[0]
    let continuation = ""
    if (continuationData.invalidationContinuationData) {
        continuation = continuationData.invalidationContinuationData.continuation
    } else if (continuationData.timedContinuationData) {
        continuation = continuationData.timedContinuationData.continuation
    }

    return [chatItems, continuation]
}

/** サムネイルオブジェクトをImageItemへ変換 */
function parseThumbnailToImageItem(data: Thumbnail[], alt: string): ImageItem {
    const thumbnail = data.pop()
    if (thumbnail) {
        return {
            url: thumbnail.url,
            alt: alt,
        }
    } else {
        return {
            url: "",
            alt: "",
        }
    }
}

function convertColorToHex6(colorNum: number) {
    return `#${colorNum.toString(16).padStart(6, '0').slice(2).toLocaleUpperCase()}`
}

/** メッセージrun配列をMessageItem配列へ変換 */
function parseMessages(runs: MessageRun[]): MessageItem[] {
    return runs.map((run: MessageRun): MessageItem => {
        if ("text" in run) {
            return run
        } else {
            // Emoji
            const thumbnail = run.emoji.image.thumbnails.shift()
            const isCustomEmoji = Boolean(run.emoji.isCustomEmoji)
            const shortcut = run.emoji.shortcuts ? run.emoji.shortcuts[0] : ""
            return {
                url: thumbnail ? thumbnail.url : "",
                alt: shortcut,
                isCustomEmoji: isCustomEmoji,
                emojiText: isCustomEmoji ? shortcut : run.emoji.emojiId,
            }
        }
    })
}

type TYPE_MAP = {
    message: MessageChatItem;
    superchat: SuperchatChatItem;
    supersticker: SuperstickerChatItem;
    'membership-join': MembershipJoinChatItem;
    'membership-gift': MembershipGiftChatItem;
    'membership-milestone': MembershipMilestoneChatItem;
    'membership-redeem': MembershipRedeemChatItem;
};

function buildBaseChatItem<T extends ChatItemTypes>(messageRenderer: MessageRendererBase, type: T): TYPE_MAP[T] {
    const authorNameText = messageRenderer.authorName?.simpleText ?? ""
    const ret: any = {
        type,
        id: messageRenderer.id,
        author: {
            name: authorNameText,
            thumbnail: parseThumbnailToImageItem(messageRenderer.authorPhoto.thumbnails, authorNameText),
            channelId: messageRenderer.authorExternalChannelId,
        },
        isMembership: false,
        isOwner: false,
        isVerified: false,
        isModerator: false,
        timestamp: new Date(Number(messageRenderer.timestampUsec) / 1000),
    }

    if (messageRenderer.authorBadges) {
        for (const entry of messageRenderer.authorBadges) {
            const badge = entry.liveChatAuthorBadgeRenderer
            if (badge.customThumbnail) {
                ret.author.badge = {
                    thumbnail: parseThumbnailToImageItem(badge.customThumbnail.thumbnails, badge.tooltip),
                    label: badge.tooltip,
                }
                ret.isMembership = true
            } else {
                switch (badge.icon?.iconType) {
                    case "OWNER":
                        ret.isOwner = true
                        break
                    case "VERIFIED":
                        ret.isVerified = true
                        break
                    case "MODERATOR":
                        ret.isModerator = true
                        break
                }
            }
        }
    }

    return ret
}

/** an action to a ChatItem */
function parseActionToChatItem(data: Action): ChatItem | null {
    if (!data.addChatItemAction) {
        return null
    }
    const item = data.addChatItemAction.item;

    try {

        if (item.liveChatTextMessageRenderer) {
            let renderer = item.liveChatTextMessageRenderer;
            let ret = buildBaseChatItem(renderer, 'message') as MessageChatItem;
            ret.message = parseMessages(renderer.message.runs);
            return ret;
        }

        if (item.liveChatPaidMessageRenderer) {
            let renderer = item.liveChatPaidMessageRenderer
            let ret = buildBaseChatItem(renderer, 'superchat') as SuperchatChatItem;
            ret.message = parseMessages(renderer.message?.runs ?? []);

            ret.superchat = {
                amount: renderer.purchaseAmountText.simpleText,
                color: convertColorToHex6(renderer.bodyBackgroundColor),
            }

            return ret;
        }

        if (item.liveChatPaidStickerRenderer) {
            let renderer = item.liveChatPaidStickerRenderer;
            let ret = buildBaseChatItem(renderer, 'supersticker');

            ret.superchat = {
                amount: renderer.purchaseAmountText.simpleText,
                color: convertColorToHex6(renderer.backgroundColor),
                sticker: parseThumbnailToImageItem(
                    renderer.sticker.thumbnails,
                    renderer.sticker.accessibility.accessibilityData.label
                )
            }

            return ret;
        }

        if (item.liveChatMembershipItemRenderer) {
            let renderer = item.liveChatMembershipItemRenderer;
            if (renderer.headerPrimaryText) {
                let ret = buildBaseChatItem(renderer, 'membership-milestone');
                ret.message = parseMessages(renderer.message?.runs ?? []);
                ret.milestoneMessage = parseMessages(renderer.headerPrimaryText.runs);
                return ret;
            } else {
                let ret = buildBaseChatItem(renderer, 'membership-join');
                ret.joinMessage = parseMessages(renderer.headerSubtext.runs);
                return ret;
            }
        }

        if (item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer) {
            let renderer = {
                ...item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer.header.liveChatSponsorshipsHeaderRenderer,
                ...item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer
            };
            let ret = buildBaseChatItem(renderer, 'membership-gift');
            ret.giftMessage = parseMessages(renderer.primaryText.runs);
            return ret;
        }

        if (item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer) {
            let renderer = item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer;
            let ret = buildBaseChatItem(renderer, 'membership-redeem');
            ret.redeemMessage = parseMessages(renderer.message.runs);
            return ret;
        }

    } catch (e) {
        throw new Error("Error while processing " + JSON.stringify(item));
    }

    return null;
}

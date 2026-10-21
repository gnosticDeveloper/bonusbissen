package studio.gnosticdeveloper.bonusbissen.storage;

/**
 * The two rendering contexts reward images actually appear in: the main
 * 4:3 card and the small square thumbnail in the member-only list.
 *
 * pfp: should be 48px 1:1.
 * banners: 16:9.
 * logos: 1:1. 128px
 */
public enum DeliveryVariant {
    CARD,
    THUMBNAIL
}

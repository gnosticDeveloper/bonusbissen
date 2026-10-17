package studio.gnosticdeveloper.bonusbissen.storage;

public enum StorageFolder {
    REWARDS("rewards"),
    PFP("pfp"),
    LOGOS("logos"),
    BANNERS("banners");

    private final String path;

    StorageFolder(String path) {
        this.path = path;
    }

    public String path() {
        return path;
    }
}

package dev.algomotion.ai.provider;

import java.util.Set;

public final class CatalogFallbackProviderAccessShim {
    private CatalogFallbackProviderAccessShim() {}
    public static Set<String> words(String s) { return CatalogFallbackProvider.words(s); }
    public static double score(Set<String> q, String t, String s) { return CatalogFallbackProvider.score(q, "", t, s); }
}

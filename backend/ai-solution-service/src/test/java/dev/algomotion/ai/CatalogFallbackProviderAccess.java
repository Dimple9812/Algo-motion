package dev.algomotion.ai;

import dev.algomotion.ai.provider.CatalogFallbackProviderAccessShim;
import java.util.Set;

final class CatalogFallbackProviderAccess {
    private CatalogFallbackProviderAccess() {}
    static Set<String> words(String s) { return CatalogFallbackProviderAccessShim.words(s); }
    static double score(Set<String> q, String t, String s) { return CatalogFallbackProviderAccessShim.score(q, t, s); }
}

package dev.algomotion.ai.provider;

/** Provider-independent text-generation port. Implementations return a JSON document following {@link Prompts#SCHEMA}. */
public interface LlmProvider {
    String name();

    String generate(String problemText) throws ProviderException;

    class ProviderException extends Exception {
        private final boolean rateLimited;

        public ProviderException(String message, boolean rateLimited) {
            super(message);
            this.rateLimited = rateLimited;
        }

        public boolean rateLimited() { return rateLimited; }
    }
}

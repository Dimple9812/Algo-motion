package dev.algomotion.viz.engine;

/** Invalid algorithm input (mapped to HTTP 422). */
public class InputException extends RuntimeException {
    public InputException(String message) { super(message); }
}

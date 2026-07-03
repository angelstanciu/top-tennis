package com.toptennis.model;

/**
 * Nivelul de joc al unui jucator, aliniat cu categoriile de turneu.
 * Rank-ul numeric (0..5) este stocat in DB si permite comparatii/filtrari.
 */
public enum SkillLevel {
    HOBBY(0, "Hobby"),
    INCEPATOR(1, "Incepator"),
    M4(2, "M4 (Incepator +)"),
    M3(3, "M3 (Mediu)"),
    M2(4, "M2 (Avansat)"),
    M1(5, "M1 (Expert)");

    private final int rank;
    private final String label;

    SkillLevel(int rank, String label) {
        this.rank = rank;
        this.label = label;
    }

    public int getRank() { return rank; }
    public String getLabel() { return label; }

    public static SkillLevel fromRank(int rank) {
        for (SkillLevel level : values()) {
            if (level.rank == rank) return level;
        }
        throw new IllegalArgumentException("Nivel de joc invalid: " + rank);
    }

    public static boolean isValidRank(Integer rank) {
        return rank != null && rank >= 0 && rank <= 5;
    }
}

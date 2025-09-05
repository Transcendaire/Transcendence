# Squid Norme

La **Squid Norme** est un ensemble de règles simples et claires pour structurer 
et écrire des fichiers de manière cohérente, afin de faciliter la collaboration
et améliorer la lisibilité du code.

## Règles fondamentales

### 1. Limites de ligne
- Limitez les lignes à 80 caractères.

### 2. Commentaires
- Absolument aucun commentaire à l'intérieur des fonctions, sauf exceptionnellement très très rarement des 
  commentaires brefs de fin de ligne (à ne pas mettre sur une ligne vide) pour expliquer des détails complexes.
- Tous les commentaires doivent être écrits en anglais.
- **Placement des commentaires**:
  - Documentez les classes avec un bloc de commentaire Doxygen avant la 
    définition de la classe, mais pas à l'intérieur de la classe.
  - Documentez les implémentations de fonctions/méthodes avec un bloc de 
    commentaire Doxygen dans le fichier d'implémentation (.cpp, .js, etc.), 
    pas dans le fichier d'en-tête/interface.
  - Ne dupliquez pas la documentation entre la déclaration et l'implémentation.
  - Lorsque vous documentez des API, documentez l'interface plutôt que 
    l'implémentation.

### 3. Espacement
- Entre deux fonctions, il doit y avoir exactement une ligne vide.
- À l'intérieur des fonctions:
  - Aucune absolument aucune ligne vide n'est autorisée, sauf:
    - Une seule ligne vide après la liste de déclarations de variables en début de fonction.
    - Une seule ligne vide au-dessus d'une déclaration d'itérateur ou de variable temporaire 
      qui n'est pas déclarée au début de la fonction.
  - Ne jamais ajouter de ligne vide après une déclaration d'itérateur ou de variable temporaire.

### 4. Structure
- Les déclarations de variables doivent être regroupées au début de la fonction.
- Les itérateurs ou variables temporaires peuvent être déclarés là où ils sont nécessaires.
- Une fonction doit idéalement accomplir une seule tâche clairement définie.
- Si une instruction (boucle ou condition) contient une seule ligne, on peut omettre 
  les accolades {} et placer l'instruction sur la même ligne.
  

### 5. Nommage
- Les noms de variables et de fonctions doivent être en camelCase et en anglais.
- Les noms doivent être descriptifs et refléter clairement leur usage.

## Exemple

### Fichier d'en-tête (.hpp)

```cpp
/**
 * @brief Mathematical utility class
 * 
 * This class provides various mathematical operations.
 */
class MathUtils {
private:
    double precision;
    
public:
    MathUtils(double precision = 0.0001);
    ~MathUtils();
    
    double computeAverage(const std::vector<double>& values);
    bool isApproximatelyEqual(double a, double b);
};
```

### Fichier d'implémentation (.cpp)

```cpp
/**
 * @brief Constructor
 * 
 * Initializes the MathUtils with the specified precision.
 * 
 * @param precision The precision value for approximate comparisons
 */
MathUtils::MathUtils(double precision) {
    this->precision = precision;
}

/**
 * @brief Computes the average of a set of values
 * 
 * @param values The vector of double values to average
 * @return The arithmetic mean of the values
 */
double MathUtils::computeAverage(const std::vector<double>& values) {
    double sum = 0.0;
    int count = values.size(); // One line after start vars declaration
    
    if (count == 0)
        return 0.0;
    for (int i = 0; i < count; i++)
        sum += values[i];

    std::vector<double>::const_iterator it; // One line before iterator declaration
    for (it = values.begin(); it != values.end(); ++it)
        if (*it < 0) // If there's only one line instruction in loops, no brackets needed but still put a \n and indent
            sum -= *it * 2; // Same in conditions
    return sum / count;
}
```

En suivant ces règles, vous faciliterez la collaboration et la compréhension 
pour les humains et les IA.

# Author

Cezou
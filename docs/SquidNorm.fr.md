# Squid Norme

La **Squid Norme** est un ensemble de règles simples et claires pour structurer 
et écrire des fichiers de manière cohérente, afin de faciliter la collaboration
et améliorer la lisibilité du code.

## Règles fondamentales

### 1. Limites de ligne
- Limitez les lignes à 80 caractères.

### 2. Commentaires
- Absolument aucun commentaire à l'intérieur des fonctions
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
- Si une instruction (boucle ou condition) contient une seule ligne, on peut omettre les accolades {} et placer l'instruction sur la même ligne.
- Mettre les accolads { et } seuls avec un retour a la ligne avant (exemple en dessous)
  

### 5. Nommage
- Les noms de variables et de fonctions doivent être en camelCase, ceux des Classes en UpperCamelCase et en 
- Les noms doivent toujours être en anglais, et descriptifs et refléter clairement leur usage.

## Exemple
#### Dans ces exemples il peut y avoir des commentaires a linterieur des fonctions, mais c'est pour t'expliquer.
#### Toi, tu ne dois mettre aucun commentaire a l'interieur des fonctions et classes, seulement en entete comme explique plus haut

### Fichier d'en-tête (.hpp)

```cpp
/**
 * @brief Mathematical utility class
 * 
 * This class provides various mathematical operations.
 */
class MathUtils
{
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
MathUtils::MathUtils(double precision)
{
    this->precision = precision;
}

/**
 * @brief Computes the average of a set of values
 * 
 * @param values The vector of double values to average
 * @return The arithmetic mean of the values
 */
double MathUtils::computeAverage(const std::vector<double>& values)
{
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
	for (it = values.begin(); it != values.end(); ++it)
	{ // If multiple lines, use brackets and put them on their own line
		double adjustedValue = *it;
		if (adjustedValue < 0)
			adjustedValue = -adjustedValue;
		sum += adjustedValue;
	}
    return sum / count;
}
```

# Fondamentaux
- Ne pas mettre de commentaire a linterieur des fonctions et classes, seulement en entete comme explique plus haut
- Boucles et conditions:
	- D'une instruction doivent etre ecrites sans accolades {}, mais toujours avec un retour a la ligne avant et indentées
	- Plusieurs instructions doivent etre ecrites avec accolades {}, chaque accolade sur leur propre ligne
- Ecrire des commentaires doxygen-type au dessus des fonctions/classes en anglais. En aucun cas a linterieur des fonctions/classes.

En suivant ces règles, vous faciliterez la collaboration et la compréhension 
pour les humains et les IA.

# Author

Cezou
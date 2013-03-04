class NaiveBayesClassifier extends Classifier

    constructor:(@threshold=0.0, @default = "Uncategorized") ->
        super()

    #Using log in the two functions below to avoid underflow
    prob_document_given_category: (dokument, klass)->
       features = @get_features(dokument)
       debugger
       prob = 0
       for feature in features
           prob += Math.log(@weighted_probability(feature, klass))
       prob

    prob_category_given_document: (dokument, klass) ->
        category_prob = Math.log(@documents_in_class_count(klass) / @total_documents_count())
        doc_prob = @prob_document_given_category(dokument, klass)
        doc_prob + category_prob

    classify: (dokument) ->
       probabilities = {}
       best_score = 0.0
       best_klass
       for klass of @klass_count
           probabilities[klass] = @prob_category_given_document(dokument, klass)
           if probabilities[klass] > best_score
                best_score = probabilities[klass]
                best_klass = klass

       if best_score > @threshold
           return klass
       else
           return @default




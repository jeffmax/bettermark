class NaiveBayesClassifier extends Classifier

    constructor:(store, threshold=0.000001, @default = "Uncategorized") ->
        super(store)
        @threshold = Math.log(threshold)

    #Using log in the two functions below to avoid underflow
    prob_document_given_category: (dokument, klass)->
       features = @get_features(dokument)
       prob = 0
       for feature in features
           prob += Math.log(@weighted_probability(feature, klass))
       prob

    prob_category_given_document: (dokument, klass) ->
        category_prob = Math.log(@documents_in_class_count(klass) / @total_documents_count())
        doc_prob = @prob_document_given_category(dokument, klass)
        doc_prob + category_prob

    classify: (dokument) ->
       log_threshold = Math.log(@threshold)
       probabilities = {}
       best_score = @threshold
       for klass of @klass_count
           probabilities[klass] = @prob_category_given_document(dokument, klass)
           if probabilities[klass] > best_score
               best_score = probabilities[klass]
               best_klass = klass
       #console.log(probabilities)
       if best_score > @threshold
           return best_klass
       else
           return @default




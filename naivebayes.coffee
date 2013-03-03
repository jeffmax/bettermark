class NaiveBayesClassifier extends Classifer

    prob_document_given_category: (dokument, cat)->
       features = @get_features(dokument)
       prob = 1
       prob * @weighted_probability(feature, cat) for feature in features

    prob_category_given_document: (dokument, cat) ->
        category_prob = @class_count(cat) / @total_count()
        doc_prob = @prob_document_given_category(dokument, cat)
        doc_prob * category_prob

    classify: (dokument) ->
       probs = {}
       best = 0.0
       `:w


class Classifier
    constructor: (@store) ->
        if @store?
            # Set internals from tore
        else
           @feature_count = {}
           @klass_count = {}
     get_features:(document) ->

     train:(document, klass) ->
         # Update number of times this feature has been classified as klass
         @get_features(document)
         for feature in features
            record = @feature_count[feature] || {}
            record[klass] = if klass of record then record[klass]+1 else 0
            @feature_count[feature]=record 
         # Update number of documents in this klass
         @klass_count[klass] = if klass of @klass_count then @klass_count[klass]+1 else 0

     # The probably a feature is in a particular class or category
     fc_probability:(feature, klass) ->
         if not klass of @klass_count
             return 0

         # What would dividing by the total occurrences of that feature give you?
         return @feature_count[feature][klass] / @klass_count[klass]


     weighted_probability:(feature, klass, ap = 0.5, ap_weight = 1.0) ->
         prob = @fc_probability(feature, klass)
         total_count = 0
         if feature of @feature_count and klass of @feature_count[feature]
             total_count =  @feature_count[feature][klass]
         #Note in PCI it said to use the total number of times this feature appears
         #in klass, but this did not make sense to me, it should be the number of times
         #the feature appeared in the klass for which we are trying to calculate a 
         #probability
         weighted = ((ap_weight * ap)+(total_count*prob))/(ap_weight+total_count)
         return weighted


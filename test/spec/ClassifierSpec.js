describe("Classifier", function() {
  var docs = ["The Python Property Builtin",
              "Python Garbage collection and file handlers",
              "Charming python: Hatch Python eggs with setuptools",
              "eggs"];
  var c; 
  beforeEach(function() {
     c = new NaiveBayesClassifier();
  });

  it("should be able to train", function() {
      for (index in docs) {
           c.train(docs[index], "python")
      }

      expect(c.total_documents_count()).toEqual(4);
      expect(c.classify("Never before seen category")).toEqual("Uncategorized");
      expect(c.classify("Hatching eggs")).toEqual("python");
  });

});

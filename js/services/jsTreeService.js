angular
  .module("PairProgramming")
  .service("jsTreeService", jsTreeService);

jsTreeService.$inject = ["CodeMirrorService", "FirebaseService", "$state"];
function jsTreeService(CodeMirrorService, FirebaseService, $state){
  FirebaseService.createKey();

  var self = this;
  self.getSha = getSha;

  function getSha(repo, token){
    $state.go("code", { key: FirebaseService.key });

    $("#commit").css("display", "block");

    $.ajax({
      url: "https://api.github.com/repos/" + repo + "/git/refs/heads/master?access_token=" + token,
      dataType: "jsonp"
    }).done(function(response){
      CodeMirrorService.createCodeMirror();
      // console.log("First response", response);
      var sha = response.data.object.sha;
      self.sha = sha;
      getTree(repo, token, sha);
    });
  }

  function getTree(repo, token, sha){
    $.ajax({
      url: "https://api.github.com/repos/" + repo + "/git/trees/" + sha + "?recursive=1&access_token=" + token,
      dataType: "jsonp"
    }).done(function(response){
      // console.log("Second response", response);
      var tree  = response.data.tree;
      buildTree(repo, tree);
    });
  }

  function buildTree(repo, tree){
    var treeParents = {};

    tree.forEach(function(node){
      treeParents[node.path] = tree.indexOf(node);
    });

    var jsTreeData = tree.map(function(node){
      var parent     = node.path.split("/");
      var treeData   = {};

      treeData.id       = treeParents[parent.join("/")];
      treeData.type     = node.type === "tree" ? "folder" : "file";
      treeData.text     = parent.length === 1 ? node.path : parent[parent.length-1];
      treeData.filePath = node.path;
      treeData.parent   = "#";

      if (parent.length > 1) {
        var tempParent = node.path.split("/");
        tempParent.pop();
        var parentPath = tempParent.join("/");
        treeData.parent = treeParents[parentPath];
      }

      return treeData;
    });

    var data = { 'core' : { 'data' : jsTreeData } };
    FirebaseService.addData(data);
    // FirebaseService.getData(FirebaseService.key);

    $('#jstree').on('select_node.jstree', function (e, data) {
      var file = data.instance.get_path(data.node,'/');
      if (!file.match(/(?:\.html|\.js|\.css|\.scss|\.sass|\.rb|\.php|\.erb|\.ejs|\.md)/)) return false;

      var raw      = "https://raw.githubusercontent.com/" + repo + "/master/" + file;
      var node     = data.node.id;
      var filePath = data.node.original.filePath;

      CodeMirrorService.init(raw, file, node, filePath);
    }).jstree({
    "core" : {
      "data" : jsTreeData
    },
    "types" : {
      "folder" : {
        "icon" : "/images/folder.png"
      },
      "file" : {
        "icon" : "/images/file.png"
      }
    },
    "plugins" : ["types"]
   });
  }
}

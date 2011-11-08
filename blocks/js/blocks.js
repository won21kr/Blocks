var Eightshapes = Eightshapes || {};
Eightshapes.Blocks = {

  //======================================================================================================
  // Default Blocks Collections
  display : {
    // Show toolbar in upper right of initial layout?
    toolbar : true,
    // Show markers button (and thus, markers overlaid in page layouts)?
    markers : true,
    // Enable component interactions like remove, previous/next, and more?
    markeractions: true,
    // In addition to component name, also reveal library's/spec's ID number
    ids : false,
    // (pending idea) Does a related library exist? (and thus, expand Blocks views for accessing library assets)
    library : false,
    projects : true,
    // (pending idea) Does a prototype Blocks homepage exist, and if so, default to it?
    homepage : false,
    // Default sizing for Grid items
    aspectratio : 1.25,
    galleryscale : 0.28,
    // Default component container
    componentcontainer : "ESBcomponentcontainer",
    // Default page viewed when you exit full screen
    lastView : "pages", // or "pages","components","activepage","activecomponent"
    lastViewID : ""
  },

  p : {},              // Pages  
  c : {},              // Components
  s : {},              // Sets
  m : 0,              // Marker Count (enumerated to relate marked components in layouts and ASIDE.notes lists)
  pc : 0,             // Page Count (enumerated because...I don't remember)
  metadata : {},      // Prototype Metadata (eventually, author, last updated, version, etc)

  init : function() {

    // Summary: Initializes the Blocks framework and current page layout
    // Called by: document.ready
    // Precondition: a page to display that may or may not contain embedded or linked components
    // Core steps include:
    //  1. Expand CSS and HTML DOM (Add style sheets, build out DOM above and around the initial page)
    //  2. Load prototype configuration (to inventory all parts: settings, pages, components, etc)
    //  3. Register (into JS Object) and create stubs (in DOM) for all prototype parts
    //  4. Load and mark all embedded and linked components in initial page
    //
    // Initialization ends with a fully loaded and marked page in view. 
    // Initialization does NOT load remaining pages, components, etc, which instead load upon exiting full screen.

    // Add Additional Style Sheets to Header
    $('head').prepend('<link rel="stylesheet" href="blocks/css/blocks.css"></link>');
    $('head').append('<link rel="stylesheet" href="blocks/css/ui-lightness/jquery-ui-1.8.6.custom.css" />');

    // Error Check Markup and Setup Overall DOM
    if (!Eightshapes.Blocks.markupCore()) return false;

    // Attempt to Load _config.xml
    //   If successful -> invoke Blocks
    //   If failure -> remove Toolbar, still try to load page components into "standalone page"
    $.ajax({
      type: 'GET',
      url: '_config.xml',
      dataType: 'xml',
      success: function(XMLconfig) {
        // Configure experience based on project-specific preferences 
        Eightshapes.Blocks.setDisplayPreferences(XMLconfig);
        Eightshapes.Blocks.setPrototypeMetadata(XMLconfig);
        
        // Identify and ID Current Page's Article
        var hrefsplit = window.location.href.split('/');
        Eightshapes.Blocks.metadata.currentpageid = hrefsplit[hrefsplit.length-1].substr(0,hrefsplit[hrefsplit.length-1].length-5);
        $('#esb > section.pages > article').attr('data-id',Eightshapes.Blocks.metadata.currentpageid);
        Eightshapes.Blocks.registerPage($('#esb > section.pages > article.active'));
  
        // Register Pages, Components, and Sets from Config XML to Eightshapes.Blocks.p, 
        // Eightshapes.Blocks.c, and Eightshapes.Blocks.s
        Eightshapes.Blocks.registerPage($(XMLconfig).find('pages > page'));
        Eightshapes.Blocks.registerComponent($(XMLconfig).find('components > component'));
        Eightshapes.Blocks.registerSet($(XMLconfig).find('sets > set'));
        
        // Mark Embedded Components in Current Page
        Eightshapes.Blocks.markComponent($('#esb > section.pages > article.active > section.design > *.component'));
        // Load and Add Linked Components in Current Page
        Eightshapes.Blocks.addComponentsToPage($('#esb > section.pages > article.active > section.design'));
      },
      error: function() {
        console.log('WARNING: _config.xml was not found in your prototype root directory.')
        // Remove the Toolbar
        $('body#esb > section.pages > menu').remove();
        // Load and Add Linked Components in Current Page
        Eightshapes.Blocks.addComponentsToPage($('#esb > section.pages > article.active > section.design'));
      }
    });

    //======================================================================================================
    // Blocks View & Toolbar Button Live Events

    // Grid/Thumbnail/List View: Click Component Title > Go To Component Notes
    $('#esb > section.components > article > header > h2').live('click', function() {
      $.bbq.pushState({view:"component", id:$(this).closest('article').attr('data-id')});
    });
    // Grid/Thumbnail/List View: Click Page Title > Go To Page Notes
    $('#esb > section.pages > article > header > h2').live('click', function() {
      $.bbq.pushState({view:"page", id:$(this).closest('article').attr('data-id')});
    });
    // Notes View: Component List Hovers
    $('#esb > section.pages > article.page > aside.notes ul.componentlist li').live('mouseover',function() {
      $(this).closest('article.page').find('section.design  section[data-marker='+$(this).attr('data-marker')+']').closest('.component').addClass('highlight');
    });
    $('#esb > section.pages > article.page > aside.notes ul.componentlist li').live('mouseout', function() {
      $(this).closest('article.page').find('section.design  section[data-marker='+$(this).attr('data-marker')+']').closest('.component').removeClass('highlight');
    });
    // Go From Article (Page, Component) to Main Section (Pages, Components)
    $('#esb > section.active.selected > header > h2, #esb > section.active.notes > header > h2').live('click', function() {
      $('#esb > header > nav.primary > ul > li.' + $(this).children('h2').html().toLowerCase()).click();
    });
    // Go From Article to Article
    $('#esb > section > menu > button.next').live('click', function() {
      var currentPage = $('#esb > section.pages > article.page.active');
      if($(currentPage).next().is('article')) {
        if($('#esb').hasClass('fullscreen')) {
          $.bbq.pushState({view:"fullscreen",id:$(currentPage).next().attr('data-id')});
        } else {
          $.bbq.pushState({id:$(currentPage).next().attr('data-id')});
        }
      }
    });
    $('#esb > section > menu > button.previous').live('click', function() {
      var currentPage = $('#esb > section.pages > article.page.active');
      if($(currentPage).prev().is('article')) {
        $.bbq.pushState({view:"page", id:$(currentPage).prev().attr('data-id')});
      }
    });
    // Turn Markers On/Off
    $('#esb > section > menu > button.markers').live('click', function() {
      ($('body').hasClass('markers')) ? $('body').removeClass('markers') : $('body').addClass('markers');
    });
    // Enter Full Screen for Page from Any Blocks View
    $('#esb > section.pages > article > header > button.fullscreen').live('click', function() {
      $.bbq.pushState({view:"fullscreen", id:$(this).closest('article').attr('data-id')});
    });
    // Exit Full Screen
    $('#esb > section > menu > button.exitfullscreen').live('click', function() {
      $.bbq.pushState({ view : Eightshapes.Blocks.display.lastView, id : Eightshapes.Blocks.display.lastViewID });
      for(componentid in Eightshapes.Blocks.c) {
        if(!Eightshapes.Blocks.c[componentid].loaded) {
          Eightshapes.Blocks.c[componentid].load();
        }
      }
      for(pageid in Eightshapes.Blocks.p) {
        if(!Eightshapes.Blocks.p[pageid].loaded) {
          Eightshapes.Blocks.p[pageid].load();
        }
      }
    });
    // Toggle Grid/Thumbnail/List view mode for Pages and Components
    $('#esb > section > menu > span.viewas > button').live('click', function() {
      $(this).addClass('active').siblings().removeClass('active');
      $('#esb > section.active')
        .removeClass('list grid thumbnail notes').attr('style','').addClass($(this).html().toLowerCase())
        .children('article').attr('style','').children('section.design').attr('style','');

      $('#esb > section.components.active.grid > article > section.variation:nth-child(3)').each( function(i,element) {
        $(element).css('width',($(element).find('section.design').width()/2+10)+'px');
        $(element).css('height',($(element).find('section.design').height()/2+60)+'px');
        $(element).parent().css('height',($(element).find('section.design').height()/2+75)+'px');
      });
    });
  },

  //======================================================================================================
  // Constructors
  Component : function(id) {
    this.id = id;
    this.source = "project";
    this.loadStarted = false;
    this.loaded = false;
    this.locationsToAddIt = [];
    this.type = "component";
    this.html = "";
    this.title = "";
    this.variationCount = 1;
    this.hasNotes = false;
    this.notes = "";
    this.notesLoaded = false;
    this.registered = false;
    this.doneness = "";
    this.description = "";
    this.container = "";
    
    // Load the component (all variations) from a file
    this.load = function() {
      var component = Eightshapes.Blocks.c[id];
      if(component.loadStarted) return false;
      component.loadStarted = true;
      $.get( Eightshapes.Blocks.sourceURL(component.source)+id+".html", function(results) {
        results = "<div>" + results + "</div>";
        component.header          = $(results).children('header').attr('id',id);
        component.html            = $(results).children('#variations');
        component.notes           = $(results).children('aside.notes').html();
        component.title           = $(results).children('header').attr('title');
        component.classes         = $(results).children('header').attr('class');
        component.container       = $(results).children('header').attr('data-container');
        component.hasNotes        = ($(results).children('aside.notes').length > 0);
        component.variationCount  = $(results).children('article#variations').children().length;

        if (component.variationCount > 1 && !component.loaded) {
          $('#esb > section.components > article[data-id=' + id + '] > header > h2').append(' <span class="count">(' + component.variationCount + ')</span>');
        }
        Eightshapes.Blocks.registerComponent(component.header);
        if($('#esb > section.components > article[data-id=' + component.id + '] > section.variation').length === 0) {
          $(component.html).children('section[data-variation]').each( function(index,element) {
            var variationid = $(this).attr('data-variation');
            var variationtitle = $(this).attr('title');
            $('#esb > section.components > article[data-id=' + id + ']')
              .append('<section class="variation ' + Eightshapes.Blocks.containComponent(id) + '" data-id="' + variationid + '" ><header><h3>' + variationtitle + '</h3></header>' + 
                 '<section class="design ' + component.classes + '">' + $(this).html() + '</section></section>')
              .children('aside.notes').find('ul.variationlist').append('<li data-variationid="' + variationid + '">' + variationtitle + '</li>');  
          })
        }

        // Load Component-Specific CSS
        if(component.cssloaded) {
          $('head').append('<link rel="stylesheet" href="' + Eightshapes.Blocks.sourceURL(source)+"css/"+id+".css" + '" />');
          component.cssloaded = true;
        }
      
        // Load - And Bind - Component-Specific JavaScript
        $.ajax( {
          type: 'GET',
          url: Eightshapes.Blocks.sourceURL(component.source)+"js/"+id+".js",
          dataType: 'script',
          success: function(data) {
            component.loaded = true;
            Eightshapes.Blocks.addComponent(component.locationsToAddIt);
          },
          error: function(data) {
            component.loaded = true;
            Eightshapes.Blocks.addComponent(component.locationsToAddIt);
          }
        });
      });

    }
  },
  Page : function(id) {
    this.id = id;
    this.loaded = false;
    this.html = "";
    this.designclasses = "";
    this.design = "";
    this.type = "page";
    this.title = "[untitled]";
    this.doneness = "unknown";
    this.description = "";
    this.index = Eightshapes.Blocks.pc++;
    
    // Load page from a file in the project root directory into Eightshapes.Blocks and the section.pages>article
    
    this.load = function() {
      var page = Eightshapes.Blocks.p[id];
      var pageArticle = $('body > section.pages > article[data-id=' + page.id + ']').append('<section class="design"></section>');
      $.get(id+".html", function(results) {
        results = "<div>" + results + "</div>";
        page.html = results;
        page.design = $(results).children('.design').children();
        page.designclasses = $(results).children('.design').attr('class');
        page.notes = $(results).children('aside.notes').children();
        page.loaded = true;
        $('#esb > section.pages > article[data-id=' + page.id + '] > section.design')
          .append($(page.design))
          .addClass(page.designclasses);
        $('#esb > section.pages > article[data-id=' + page.id + '] > aside.notes')
          .append($(page.notes));
        
        // Mark all components embedded in the loaded page classed with "component" 
        Eightshapes.Blocks.markComponent($('#esb > section.pages > article[data-id=' + page.id + '] > section.design > *.component'));
        
        // Load all components into the page that contain data-component attribute
        Eightshapes.Blocks.addComponentsToPage($('#esb > section.pages > article[data-id=' + page.id + '] > section.design'));
      })
    };
  },

  //======================================================================================================
  // Markup & Modular Loading, Adding & Marking
  markupCore : function() {

    // Summary: Wraps markup of current page with the core DOM element structure, sets up some live events
    // Called by: init
    // Preconditions: 
    //    A child of the BODY tag with a class="design", demarking the page layout
    //    An <aside class="notes"> tag - child of the BODY tag - can also be included
    //    The BODY tag should have no other children
    //

    if ($('body > .design').length < 1) {
      alert('EightShapes Blocks will not function without <section class="design">');
      return false;
    }
    $('body')
      .attr('id','esb').addClass('fullscreen')
      .wrapInner('<section class="pages active" data-section="pages"><article class="page active"></article></section>')
      .append('<section class="components" data-section="components"><header><h2>Components</h2></header></section>');
    $('#esb > section.pages').prepend(Eightshapes.Blocks.menuMarkup());

    // Grid's Page Sizing
    $('body > section > menu > span.sizeslider > div.esbgallerysize').slider({
      value: 0.28,
      min: 0.15,
      max: 0.4,
      step: 0.01,
      slide: function(event,ui) {
        Eightshapes.Blocks.display.galleryscale = ui.value;

        $('#esb > section.pages > article')
          .css('width',1000*Eightshapes.Blocks.display.galleryscale)
          .css('height',1000*Eightshapes.Blocks.display.aspectratio*Eightshapes.Blocks.display.galleryscale+50);

        $('#esb > section.pages > article > section.design')
          .css('-moz-transform','scale('+Eightshapes.Blocks.display.galleryscale+')')
          .css('-webkit-transform','scale('+Eightshapes.Blocks.display.galleryscale+')')
          .css('height',960*Eightshapes.Blocks.display.aspectratio);
      }
    });
    $('body > section > menu > span.heightslider > div.esbgalleryaspectratio').slider({
      value:1.25,
      min:0.6,
      max:2.0,
      step:0.05,
      slide: function(event,ui) {
        Eightshapes.Blocks.display.aspectratio = ui.value;
        $('#esb > section.pages > article')
          .css('width',1000*Eightshapes.Blocks.display.galleryscale)
          .css('height',1000*Eightshapes.Blocks.display.aspectratio*Eightshapes.Blocks.display.galleryscale+50);
        $('#esb > section.pages > article > section.design')
          .css('-moz-transform','scale('+Eightshapes.Blocks.display.galleryscale+')')
          .css('-webkit-transform','scale('+Eightshapes.Blocks.display.galleryscale+')')
          .css('height',960*Eightshapes.Blocks.display.aspectratio);
      }
    });

    $('body').prepend('<header><nav class="primary"><ul></ul></nav></header>');
    $('body > header > nav > ul')
      .append('<li class="pages" data-view="pages">Pages</a></li>')
      .append('<li class="components" data-view="components">Components</a></li>');

    $('body > header > nav.primary > ul > li').click( function() {
      $.bbq.pushState({view:$(this).attr("data-view"),id:"n/a"});
      return false;
    });

    return true;
  },

  registerPage : function(elements,setid) {

    // Summary: Registers the current page and pages identified in Config XML into Eightshapes.Blocks.p
    // Called by: init, registerSet
    // Parameters:
    //    elements: 1 (current page in DOM) or 0+ (from Config XML PAGES element)
    //    setid (optional): Used for registering page in a set in BODY>SECTION.sets>SECTION.set (future)
    //

    // Make the assumption that the active page article is the page loaded into the browser at page load
    var loadedPageID = $('#esb > section.pages > article.active').attr('data-id');

    // reachedLoadedPageYet : Used to order page <articles> in DOM to match sequence of config XML file
    var reachedLoadedPageYet = false;

    elements.each(function (i,element) {

      var currentArticle = "";
      var id = $(element).attr('id');

      if ($(element).attr('data-id')) {
        currentArticle = element;
        id = $(element).attr('data-id');
      }
      if (id === loadedPageID) {
        reachedLoadedPageYet = true;
      }

      // ESB Page exist?
      if (!Eightshapes.Blocks.p[id]) {
        Eightshapes.Blocks.p[id] = new Eightshapes.Blocks.Page(id);
      }
      
      // Update with Properties from Element Provided
      if ($(element).attr('doneness')) {
        Eightshapes.Blocks.p[id].doneness = $(element).attr('doneness');
      } 
      if ($(element).attr('description')) {
        Eightshapes.Blocks.p[id].description = $(element).attr('description');
      } 
      if ($(element).attr('title')) {
        Eightshapes.Blocks.p[id].title = $(element).attr('title');
      }
      
      // ARTICLE Empty Components List
      var articleComponentsList = '<h3>Components</h3><ul class="componentlist itemstack"></ul>';      

      // Section > Article exist?
      if ($('#esb > section.pages > article[data-id=' + id + ']').length === 0) {
        if (reachedLoadedPageYet) {
          $('#esb > section.pages').append('<article data-id="' + id + '" class="page"></article>');
        } else {
          $('#esb > section.pages > article.active').before('<article data-id="' + id + '" class="page"></article>');
        }
      }

      currentArticle = $('#esb > section.pages > article[data-id=' + id + ']');
      if ($(element).attr('type')) {
        $(currentArticle).attr('data-pagetype',$(element).attr('type'));
        if(($(currentArticle).prev().attr('data-pagetype') === $(element).attr('type'))) {
          $(currentArticle).addClass('variation');
        }
      }

      // Section > Article > Header exist?
      if($(currentArticle).children('header').length === 0) {
        $(currentArticle).prepend('<header></header>');
      }
      $(currentArticle).children('header').html(Eightshapes.Blocks.articleHeader(Eightshapes.Blocks.p[id]));
      
      // Section > Article > Design exist?
      if($(currentArticle).children('section.design').length > 0) {
        Eightshapes.Blocks.p[id].loaded = true;
      }

      // Section > Article > Aside.notes exist?
      if ($(currentArticle).children('aside.notes').length === 0) {
        $(currentArticle).children('header').after('<aside class="notes">' + articleComponentsList + '</aside>');
      } else if ($(currentArticle).children('aside.notes').children('ul.componentlist').length === 0) {
        $(currentArticle).children('aside.notes').prepend(articleComponentsList)
      }

      if(setid !== undefined) {
        if($(currentArticle).children('aside.notes').children('ul.appearsinlist').length === 0) {
          $(currentArticle).children('aside.notes').append('<h3>Appears In</h3><ul class="appearsinlist itemstack"></ul>');
        }
        $(currentArticle).children('aside.notes').children('ul.appearsinlist').append('<li>' + Eightshapes.Blocks.s[setid].title + '</li>');
      }
      
    });  
  },
  
  registerComponent : function(elements) {

    // Summary: Register a component found in XML>COMPONENTS, the default page, or a loaded page
    // Description: Will clarify essential component properties (such as title and source), create the object, and
    //    stub out the HEADER, ARTICLE, and ASIDE.notes within BODY>SECTION.components>ARTICLE
    // Parameter: 1+ elements within a page layout or found in XML

    elements.each(function (i,element) {
      var id;
      if($(element).attr('data-component')) {
        id = $(element).attr('data-component');
      } else {
        id = $(element).attr('id');
      }
      var articleStub = false;
      if (!Eightshapes.Blocks.c[id]) {
        Eightshapes.Blocks.c[id] = new Eightshapes.Blocks.Component(id);
      }
      if ($(element).attr('data-source')) {
        Eightshapes.Blocks.c[id].source =  $(element).attr('data-source');
      }
      
      if (($(element).attr('data-description')) && (Eightshapes.Blocks.c[id].description === "")) {
        Eightshapes.Blocks.c[id].description = $(element).attr('data-description');
      }
      if (($(element).attr('data-doneness')) && (Eightshapes.Blocks.c[id].doneness === "")) {
        Eightshapes.Blocks.c[id].doneness = $(element).attr('data-doneness');
      }
      if (($(element).attr('title')) && (Eightshapes.Blocks.c[id].title === "")) {
        Eightshapes.Blocks.c[id].title = $(element).attr('title');
      }

      // Article Header 
      var articleHeader = '<header><button class="esb remove"></button><h2 class="' + Eightshapes.Blocks.c[id].doneness + '">' + Eightshapes.Blocks.c[id].title + '</h2><span class="description">' + Eightshapes.Blocks.c[id].description + '</span></header>';

      // Article Notes Default
      var articleNotes = '<h3>Variations</h3><ul class="variationlist itemstack"></ul>';      
      // Append Notes from Component File
      if (Eightshapes.Blocks.c[id].hasNotes) {
        articleNotes += Eightshapes.Blocks.c[id].notes;
      }

      // Cycle through existing component ARTICLES to find the current element's ARTICLE and initialize aspects
      $('#esb > section.components > article').each(function (i,articleelement) {
        if($(articleelement).attr('data-id') === id) {
          articleStub = true;
          if($(articleelement).children('header').length === 0) {
            $(articleelement).prepend(articleHeader);
          }
          if($(articleelement).children('section.variation').length > 0) {
            Eightshapes.Blocks.c[id].loaded = true;
          }
          if($(articleelement).children('aside.notes').length === 0){
            $(articleelement).append('<aside class="notes">' + articleNotes + '</aside>');
            return;
          }
          if ($(articleelement).children('aside.notes').children('ul.variationlist').length === 0) {
            $(articleelement).find('aside.notes').prepend(articleNotes);
            return;
          } 
          if (Eightshapes.Blocks.c[id].hasNotes && !Eightshapes.Blocks.c[id].notesLoaded) {
            $(articleelement).find('aside.notes').append(Eightshapes.Blocks.c[id].notes);
            Eightshapes.Blocks.c[id].notesLoaded = true;
            return;
          }
          return;
        }
      });
      if (!articleStub) {
        $('#esb > section.components').append('<article data-id="' + id + '" class="component">' + articleHeader + '<aside class="notes">' + articleNotes + '</aside></article>');
        if(Eightshapes.Blocks.c[id].hasNotes) {
          Eightshapes.Blocks.c[id].notesLoaded = true;
        }
      }
      Eightshapes.Blocks.c[id].registered = true;
    });
  },

  addComponentsToPage : function(pageElement) {

    // Summary: Traverses a loaded page layout and loads & adds all not-yet-loaded components
    // Description: If a page's component is already available (loaded), it's added immediately.
    //    Otherwise, the system will queue the component for loading, which once complete, 
    //    will add it to the page(s) waiting for it  
    // Parameter: pageElement, An existing full page layout already loaded in BODY>SECTION.pages>ARTICLE>SECTION.design

    var pageID = $(pageElement).parent().attr('data-id')
    $(pageElement).find('*[data-component]').each( function(i) {
      var id=$(this).attr('data-component');
      var $component = Eightshapes.Blocks.c[id];
      if($component && $component.loaded) {
        Eightshapes.Blocks.addComponent(this);
      } else {
        if (!$component) {
          Eightshapes.Blocks.c[id] = new Eightshapes.Blocks.Component(id);
          $component = Eightshapes.Blocks.c[id];
        }
        $component.locationsToAddIt.push(this);
        $component.load();
      }
    });
  },

  addComponent : function(elements) {
    
    // Summary: Clone 1+ component variations from BODY>SECTION.components into a BODY>SECTION.pages>ARTICLE layout
    // Parameter: 1+ elements within BODY>SECTION.pages>ARTICLE layouts 
    // Called by: 
    //    addComponentsToPage (for each component in a layout that's already known to be loaded)
    //    Component.load (for when a component load is triggered, to complete the circle and get it 
    //                    – and other queued places to add that component - in their layout locations)

    $(elements).each(function(index,element) {
      var id = $(element).attr('data-component');
      var clonedComponent;

      // Clone the Component
      if ($(element).attr('data-variation')) {
        clonedComponent = $('#esb > section.components > article[data-id=' + id + ']').find('section[data-id=' + $(element).attr('data-variation') + '] > section.design').clone(true);

        // Need to add an ELSE IF for if variation can't be found
        // then append first, and if not
        // then append entire c[].html
      
      } else {
        clonedComponent = $('#esb > section.components > article[data-id=' + id + ']').find('section:nth-child(3) > section.design').clone(true);
      }
    
      // Append Clone to Page Layout
      $(element).append($(clonedComponent).children()).addClass('loaded');

      // Class Component within Page Layout
      if (Eightshapes.Blocks.c[id].classes) {
        $(element).addClass(Eightshapes.Blocks.c[id].classes);
      }
      
      // Mark (single) Component that's just been added to one layout
      Eightshapes.Blocks.markComponent(element);
    })
  },

  markComponent : function(componentElements) {

    // Summary: Mark a component in a page layout with the orange annotation marker and 
    // outline & add it to the Notes list
    // Parameter: componentElements, a collection of 1+ components in a BODY>SECTION.pages>ARTICLE>SECTION.design
    // Description: Marks the component with a label and also embeds relevant buttons (previous/next variation, 
    //    show/hide, remove) and notations (notes available? variation id, etc)

    $(componentElements).each( function (i,element) {
      var marker = Eightshapes.Blocks.m++;
      
      // Default values
      var componentid = "";
      var componentname = "[Untitled]";
      var variationTitle = "Default";
      
      if ($(element).attr('data-component')) {
        componentid = $(element).attr('data-component');
      }
      if ($(element).attr('title')) {
        componentname = $(element).attr('title');
      } else if (Eightshapes.Blocks.c[componentid]) {
        if (Eightshapes.Blocks.c[componentid].title !== "") {
          componentname = Eightshapes.Blocks.c[componentid].title;
        } 
      }
      if ($(element).attr('data-variation')) {
        var variationHTML = $(Eightshapes.Blocks.c[componentid].html).find('[data-variation='+$(element).attr('data-variation')+']');
        variationTitle = ($(variationHTML).attr('title')) ? $(variationHTML).attr('title') : $(variationHTML).attr('data-variation');
      }
      
      // Ensure Component has Component Class
      $(element).addClass('component');
      
      // Add Marker to Design
      if(Eightshapes.Blocks.display.markers) {
        $(element).prepend(' <div class="esbmarker-wrapper"><section class="esbmarker" data-marker="' + marker + '"><div><button class="esb remove"></button><button class="esb showhide"></button>' + componentname + '</div></section></div>');
        // Notes
        if(Eightshapes.Blocks.c[componentid] && (Eightshapes.Blocks.c[componentid].hasNotes || Eightshapes.Blocks.c[componentid].variationCount > 1)) {
          $(element).find('section.esbmarker > div:first-child').append('<button class="esb notes"></button>')
        }
        /* 
        $(element).find('section.esbmarker').click( function() {
          $('#esb > section').removeClass('active');
          $('#esb > section.components').addClass('active').addClass('notes');
        })
        */
        $(element).find('section.esbmarker button.showhide').click( function(event) { Eightshapes.Blocks.toggleComponentDisplay(event); event.stopPropagation(); })
        $(element).find('section.esbmarker button.remove').click( function(event) { Eightshapes.Blocks.removeComponent(event); event.stopPropagation(); })
      }
      
      // Add Marker to Notes
      var noteElement = $(element).closest('article.page').children('aside.notes').find('ul.componentlist').append('<li class="esbmarker" data-marker="' + marker + '" data-id=' + componentid + '></li>').find('li:last-child');
      $(noteElement).append('<div><button class="esb remove"></button><button class="esb showhide"></button>' + componentname + '</div>')
      $(noteElement).find('button.remove').click( function(event) { Eightshapes.Blocks.removeComponent(event) })
      $(noteElement).find('button.showhide').click( function(event) { Eightshapes.Blocks.toggleComponentDisplay(event) })
      $(noteElement).click( function() {
        if ($(this).attr('data-id') !== "") {
          Eightshapes.Blocks.gtC($(this).attr('data-id'));
        }
      })
      // Variations
      /*
      if(Eightshapes.Blocks.c[componentid] && (Eightshapes.Blocks.c[componentid].variationCount>1)) {
        $(noteElement).append(' <div class="variations"><button class="next"></button><button class="previous"></button>' + variationTitle + '</div>')
        $(noteElement).find('button.previous').click( function(event) { Eightshapes.Blocks.previousComponent(event) })
        $(noteElement).find('button.next').click( function(event) { Eightshapes.Blocks.nextComponent(event) })
      }
      */

    });
  },

  //======================================================================================================
  // Component Interactions

  toggleComponentDisplay : function(event) {

    // Summary: Toggles the visible display of a component element in BODY>SECTION.pages>ARTICLE>SECTION.design

    event.stopPropagation();
    var marker = $(event.target).closest('.esbmarker[data-marker]').attr('data-marker');
    var notesItem = $('body').find('aside.notes li[data-marker='+marker+']');
    var designItem = $('body').find('section.design .component .esbmarker[data-marker='+marker+']').parent().parent();
    if ($(notesItem).hasClass('hidden')) {
      $(notesItem).removeClass('hidden');
      $(designItem).slideDown(1000);
    } else {
      $(notesItem).addClass('hidden');
      $(designItem).slideUp(1000);
    }
  },

  removeComponent : function(event) {

    // Summary: Removes a component element from a BODY>SECTION.pages>ARTICLE>SECTION.design

    event.stopPropagation();
    var marker = $(event.target).closest('.esbmarker[data-marker]').attr('data-marker');
    var notesItem = $('body').find('aside.notes li[data-marker='+marker+']');
    var designItem = $('body').find('section.design .component .esbmarker[data-marker='+marker+']').parent().parent();

    $(notesItem).slideUp(500, function() { $(this).remove() });
    $(designItem).slideUp(1000, function() { $(this).remove() });
  },

  previousComponent : function(event) {

    // Summary: From a marker in the layout or Page Notes component list, 
    // toggle between 2+ variations of a component
    // Status: Worked in previous versions, not currently functional

    var marker = $(event.target).closest('.esbmarker[data-marker]').attr('data-marker');
    var notesItem = $('body').find('aside.notes li[data-marker='+marker+']');
    var designItem = $('body').find('section.design .component .esbmarker[data-marker='+marker+']').parent().parent();
    var componenthtml = $(Eightshapes.Blocks.c[$(designItem).attr('data-component')].html);
    var variationid = $(designItem).attr('data-variation');
    var previousVariation;

    $(designItem).children('*:not(.esbmarker)').remove();
    
    if ($(componenthtml).find('#v'+variationid).index() > 0) {
      previousVariation = $(componenthtml).find('#v'+currentVariation).prev().clone(); 
    } else {
      previousVariation = $(componenthtml).children().parents("#variations").children(':last-child').clone();
    }

    $(designItem)
      .append($(previousVariation).children())
      .attr('data-variation',$(previousVariation).attr('id').split('v')[1])
 
  },

  nextComponent : function(event) {

    // Summary: From a marker in the layout or Page Notes component list, 
    // toggle between 2+ variations of a component
    // Status: Worked in previous versions, not currently functional

    var marker = $(event.target).closest('.esbmarker[data-marker]').attr('data-marker');
    
    
    /*
      var domCom = $('div[data-esumarker="' + $(this).closest('li[data-esumarkerref]').attr('data-esumarkerref') + '"]').parent()
      $(domCom).children('*:not(.actions,.marker)').remove()
  
      var nextVariation
      if ($(esu.components[$(domCom).attr('data-componentid')].html).find('#v'+$(domCom).attr('data-variation')).index() < (esu.components[$(domCom).attr('data-componentid')].variationCount - 1)) {
        nextVariation = $(esu.components[$(domCom).attr('data-componentid')].html).find('#v'+$(domCom).attr('data-variation')).next().clone()
      } else {
        nextVariation = $(esu.components[$(domCom).attr('data-componentid')].html).children().parents("#variations").children(':first-child').clone()
      }
  
      $(domCom)
        .append($(nextVariation).children())
        .attr('data-variation',$(nextVariation).attr('id').split('v')[1])
        
    */
  },

  //======================================================================================================
  // Sets "Stuff"

  Set : function(element) {
    this.pages = [];
    this.title = ($(element).attr('title')) ? $(element).attr('title') : '[Untitled]';
    this.type = ($(element).attr('type')) ? $(element).attr('type') : 'basic';
    this.version = ($(element).attr('version')) ? $(element).attr('version') : '';
    this.description = ($(element).attr('description')) ? $(element).attr('description') : '';
    this.doneness = ($(element).attr('doneness')) ? $(element).attr('doneness') : 'notyetstarted';
    this.loaded = false;
  },
  loadSet : function(setID) {

    // Summary: Loads a set into BODY>SECTION.sets>SECTION.set by cloning from BODY>SECTION.pages>ARTICLE>SECTION.design(s)
    // Status: Worked in previous versions, not currently functional

    if (Eightshapes.Blocks.s[setID].pages.length > 1 && !Eightshapes.Blocks.s[setID].loaded) {
      $('#esb > section.sets > section[data-id=set' + setID + '] > header > h2').append(' <span class="count">(' + Eightshapes.Blocks.s[setID].pages.length + ')</span>');
    }

    for(pagecount=0;pagecount<Eightshapes.Blocks.s[setID].pages.length;pagecount++) {
      $('#esb > section.sets > section[data-id=set' + setID + '] > article[data-id=' + Eightshapes.Blocks.s[setID].pages[pagecount] + ']')
        .append($('#esb > section.pages > article[data-id=' + Eightshapes.Blocks.s[setID].pages[pagecount] + ']').clone(true).children('section.design,header'));
    }
    Eightshapes.Blocks.s[setID].loaded = true;
  },
  registerSet : function(elements) {
    elements.each(function (i,element) {

      Eightshapes.Blocks.s[i] = new Eightshapes.Blocks.Set(element);
      if ($(element).attr('pages')) {
        Eightshapes.Blocks.s[i].pages = $(element).attr('pages').split(',');
      } else if ($(element).children('page').length > 0) {
        $(element).children('page').each( function(pageindex,pageelement) {
          Eightshapes.Blocks.s[i].pages[pageindex] = $(pageelement).attr('id');
        });
      } else {
        // What happens if no pages exist?
      }

      $('#esb > section.sets').append('<section data-id="set' + i + '" class="set"><header></header></section>')
//      $('#esb > section.sets > section[data-id=set' + i + '] > header').html(Eightshapes.Blocks.articleHeader(Eightshapes.Blocks.s[i])).after(Eightshapes.Blocks.asideToolbarMarkup());

      for(pagecount=0;pagecount<Eightshapes.Blocks.s[i].pages.length;pagecount++) {
        $('#esb > section.sets > section[data-id=set' + i + ']')
          .append('<article class="page" data-id="' + Eightshapes.Blocks.s[i].pages[pagecount] + '"></article>');
        Eightshapes.Blocks.registerPage($('#esb > section.sets > section[data-id=set' + i + '] > article.page:last-child'),i);
      }
      
    })
  },

  //======================================================================================================
  // Utilities

  view : function() {
    
    // Summary: Flushes all view-controlling classes from top-level elements (BODY>SECTION, ARTICLES within, etc),
    //    then sets the appropriate class combinations to create the requested view. Also accounts for back button.

    var article;

    // Determine Current View
    var view = $.bbq.getState( "view" );
    var id = $.bbq.getState( "id" );

    // Discard links within prototype pages 
    // (links containing a hash tag will tigger hashchange).
    // https://github.com/EightShapes/Blocks/issues/7
    if (view == undefined && id == undefined) {
      return false;
    }
    
    // Flush View Classes
    $('body').removeClass('fullscreen');
    $('body > header > nav > ul > li').removeClass('active');
    $('body > section').removeClass('active notes grid list thumbnail').attr('style','');
    $('body > section > article').removeClass('active list thumbnail grid inlineflow').attr('style','').children('section.design').attr('style','');

    // Set View Classes for Current View
    switch (view) {
      case "pages":
        $('body > header > nav > ul > li.pages').addClass('active');
        $('body > section.pages').addClass('active grid');
        Eightshapes.Blocks.display.lastView = "pages";
        Eightshapes.Blocks.display.lastViewID = "";
        break;
      case "page":
        $('body > header > nav > ul > li.pages').addClass('active');
        $('body > section.pages').addClass('active notes');
        $('body > section.pages > article[data-id=' + id + ']').addClass('active')
        Eightshapes.Blocks.display.lastView = "page";
        Eightshapes.Blocks.display.lastViewID = id;
        break;
      case "components":
        $('body > header > nav > ul > li.components').addClass('active');
        $('body > section.components').addClass('active grid');
        Eightshapes.Blocks.display.lastView = "components";
        Eightshapes.Blocks.display.lastViewID = "";
        break;
      case "component":
        $('body > header > nav > ul > li.components').addClass('active');
        $('body > section.components').addClass('active notes')
        $('body > section.components > article[data-id=' + id + ']').addClass('active')
          .children('section.variation').each( function(i,element) {
            $(element).css('width','').css('height','')
            $(element).css('width',($(element).find('section.design').width()/2+10)+'px');
            $(element).css('height',($(element).find('section.design').height()/2+60)+'px');
          });
        Eightshapes.Blocks.display.lastView = "component";
        Eightshapes.Blocks.display.lastViewID = id;
        break;
      case "fullscreen":
        $('body').addClass('fullscreen');
        $('body > section.pages').addClass('active');
        $('body > section.pages > article[data-id=' + id + ']').addClass('active');
        break;
    }
  },

  setDisplayPreferences : function(XMLconfig) {

    // Summary: Read the XML and update any preferences based on what's included

    if($(XMLconfig).find('display > property[name="componentcontainer"]')) {
      Eightshapes.Blocks.display.componentcontainer = $(XMLconfig).find('display > property[name="componentcontainer"]').attr('value');
    }
    ($(XMLconfig).find('display > property[name="markers"]').attr('value') === "false") ? Eightshapes.Blocks.display.markers = false : Eightshapes.Blocks.display.markers = true;
    ($(XMLconfig).find('display > property[name="toolbar"]').attr('value') === "false") ? Eightshapes.Blocks.display.toolbar = false : Eightshapes.Blocks.display.toolbar = true;
  },

  setPrototypeMetadata : function(XMLconfig) {

    // Summary: Read the XML and setup the prototype metadata (author, title, etc)

    // ESB Header Title 
    Eightshapes.Blocks.metadata.title = $(XMLconfig).find('metadata').attr('title');
    $('body > header').append('<h1>' + Eightshapes.Blocks.metadata.title + '</h1><dl></dl>');
    
    // ESB Header Metadata
    Eightshapes.Blocks.metadata.version = $(XMLconfig).find('metadata > version').attr('number');
    Eightshapes.Blocks.metadata.author = $(XMLconfig).find('metadata > author').attr('name');
    Eightshapes.Blocks.metadata.versiondate = $(XMLconfig).find('metadata > version').attr('date');
    Eightshapes.Blocks.metadata.client = $(XMLconfig).find('metadata > client').attr('name');
    $('body > header > dl')
      .append('<dt>Version</dt> <dd>' + Eightshapes.Blocks.metadata.version + '</dd> ')
      .append('<dt>by</dt> <dd>' + Eightshapes.Blocks.metadata.author + '</dd> ')
      .append('<dt>on</dt> <dd>' + Eightshapes.Blocks.metadata.versiondate + '</dd> ')
      .append('<dt>for</dt> <dd>' + Eightshapes.Blocks.metadata.client + '</dd> ')
  },

  menuMarkup : function() {

    // Summary: Centralize the markup added for toolbar sliders, buttons, etc

    return '<menu><span class="controlset sizeslider"><h3>Size</h3><span class="icon small"></span><div class="esbgallerysize" style="width: 100px;"></div><span class="icon large"></span></span><span class="controlset heightslider"><h3>Height</h3><span class="icon short"></span><div class="esbgalleryaspectratio" style="width: 100px;"></div><span class="icon tall"></span></span> <span class="controlset  viewas"><button class="list active">List</button><button class="thumbnail">Thumbnail</button><button class="grid">Grid</button></span><button class="exitfullscreen">Exit Full Screen</button><button class="markers">Markers</button><button class="previous">Previous</button><button class="next">Next</button></menu>';
  },

  articleHeader : function(item) {

    // Summary: Adds simple markup inside HEADER of an article in BODY>SECTION.pages, 
    // including buttons, labels, and more
    // Called by: registerPage
    // Preconditions: ARTICLE>HEADER exists

    if (Eightshapes.Blocks.display.toolbar) {
      return '<button class="fullscreen"></button><h2 class="' + item.doneness + '" data-view="' + item.id + '">' + item.title + '</h2><span class="version">' + item.version + '</span><span class="description">' + item.description + '</span>';
    } else {
      return '';
    }
    
  },

  sourceURL : function(type) {
    switch(type) {
    case "library":
      return "library/components/";
    case "project":
      return "components/";
    default:
      return "components/";
    }
  },

  keyboardshortcuts : function(event) {
    var currentView = $.bbq.getState( "view" ) ? $.bbq.getState( "view" ) : "fullscreen";
    if (event.altKey) {
      if (event.shiftKey) {
      switch(event.keyCode) {
        case 77: // M
          ($('body').hasClass('markers')) ? $('body').removeClass('markers') : $('body').addClass('markers');
          break;
        case 39: // ALT ARROW >
          if ($('body#esb > section.pages.active.notes') || $('body#esb.fullscreen')) {
            var currentPage = $('#esb > section.pages > article.page.active');
            if($(currentPage).next().is('article')) {
              if(!Eightshapes.Blocks.p[$(currentPage).next().attr('data-id')].loaded) {
                Eightshapes.Blocks.p[$(currentPage).next().attr('data-id')].load();
              }
              $.bbq.pushState({view: currentView, id:$(currentPage).next().attr('data-id')});
            }
          }
          break; 
        case 37: // ALT ARROW <
          if ($('body#esb > section.pages.active.notes') || $('body#esb.fullscreen')) {
            var currentPage = $('#esb > section.pages > article.page.active');
            if($(currentPage).prev().is('article')) {
              $.bbq.pushState({view: currentView, id:$(currentPage).prev().attr('data-id')});
            }
          }
          break; 
      } 
      }
    }
  },

  containComponent : function(id) {

    // Summary: Adds a class to component variations for "customizeable width displays" 
    // within Component Grids and Notes

    return (Eightshapes.Blocks.c[id].container) ? Eightshapes.Blocks.c[id].container : Eightshapes.Blocks.display.componentcontainer; 
  }

}

$(document).ready(function(){
  $.import_js("blocks/js/jquery-ui-1.8.6.custom.min.js"); 
  $.import_js("blocks/js/jquery-bbq.js");

  $(window).resize(function() {                                               
    console.log($(window).width());
  });

  Eightshapes.Blocks.init();

  $(window).bind( "hashchange", function(e) {
    Eightshapes.Blocks.view();
  })

  $(document).keydown(function (event) {
    Eightshapes.Blocks.keyboardshortcuts(event);
  });
});

/* 
 * This code attributed to http://www.kipras.com/
 * NOTE: Errors in included files will be reported as errors in the HTML file
 *       by Firebug.
 * $.import_js() helper (for javascript importing within javascript).
 */
(function($) {
    var import_js_imported = [];

    $.extend(true, {
      import_js : function(script) {
        var found = false;
        for (var i = 0; i < import_js_imported.length; i++) {
          if (import_js_imported[i] == script) {
            found = true;
            break;
          }
        }

        if (found == false) {
          $("head").append('<script type="text/javascript" src="' + script + '"></script>');
          import_js_imported.push(script);
        }
      }
    });
})(jQuery);
/**
 *
 * Author: tianchungang
 * Date: 14-1-12
 * Time: 下午8:22
 */
(function ($)
{

    //这三个是？
    var MarkerManager = {
        container:{}
    };
    MarkerManager.setMarker = function(id,marker){
        this.container[id] = marker;
    };

    MarkerManager.getMarker = function(id){
        return this.container[id];
    };
    //

    //jquery对象增加方法marker用来生成
    $.fn.marker = function (options)
    {
        this.options = {
            data:null,                                    //本地渲染数据（坐标与标记图标的地址）
            url:"",                                       //远程数据url //这个其实是编辑模式中，当用户点击标注时，在对话框中显示内容的url。frame为true时，为frame引用的路径。frame为false时是用post获取该路径的数据。
            viwUrl:"",                                     //远程展示数据url
            picUrl:"",                                     //底层图片的地址
            markerUrl:"",                                  //标注点 数据远程url  //获取标注信息（如x、y，数据内容等）的地址，使用post获取。该部分不为null才initjq对象时才会调用内部的loadData函数。
            picWidth:null,                                 //图片展示宽度 //createHtml函数中使用
            picHeight:null,                                 //图片展示高度 //createHtml函数中使用
            isEdit:false,                                  //设置为true，双击标注图标能进行属性编辑 //确定标记板当前为何种模式
            popWidth:200,                                  //弹出窗口宽度 //编辑模式时点击标注弹出框的大小
            popHeight:200,                                 //弹出窗口内容高度  //编辑模式时点击标注弹出框的大小
            popTitle:"标注坐标点",                          //弹窗标题  //编辑模式时点击标注弹出框的大小
            hasSelfCur:false,                              //是否采用自定义cursor //点击标记对象模板后自定义的标记样式。是标记对象模板的src属性制定。
            okCallBack:null,                               //弹窗确定按钮的回调函数，可添加保存数据功能  //编辑模式时点击标注弹出框提供了默认的ok按钮。按钮点击后的回调。(编辑模式下的frame为true时。)
            markId:"",                                     //指定用来标注的图标ID //如:ul li组合。
            frame:false,								   //编辑模式时点击标注弹出框是否是frame方式
            viewClick:null,								   //
            cancelCallBack:null								//编辑模式时点击标注弹出框提供了默认的cancel按钮。按钮点击后的回调。(编辑模式下的frame为true时。)
        };
        $.extend(this.options,options); //参数合并到this.options参数对象
        return $.marker.init(this); //返回初始化的marker对象。
    };

    //获取当前id的值？
    $.fn.getMarker = function(){
        $(this).attr("id");
    };

    //marker对象
    //？这种写法是否一个页面就只有一个可以标注的的图片了？是否改用prototype或闭包写法。
    $.marker = {
        init:function(obj){
            var p = this.options = obj.options;
            var g = this; //marker对象
            g.setObj(obj); //jq对象
            g.setFlag(-1); //？
            g.createHtml(); //render界面
            g.initCursor(); //
            g.initEvent(); //增加交互用的事件

            //
            if( p.markerUrl){ //
                g.loadData();
            }

            return this;
        },
        //创建界面的html元素
        //包括一个外部相对布局的外框，内部的底层图片、位于图片上层的标注所在的蒙版（透明并覆盖提成图片。markerlayer）。
        //图片显示大小由插件参数picWidth、picHeight决定。 
        createHtml:function(){
            var p = this.options;
            var g = this;
            var htmlArr = [];
            var width = p.picWidth?'width:'+ p.picWidth+'px;':'';
            var height = p.picHeight?'height:'+ p.picHeight+'px;':'';
            htmlArr.push('<div style="position: relative;'+width+ height+'">');//FIXME 是不是少了结束标志？
            htmlArr.push('<img src="'+ p.picUrl+'" style="'+width+height+'" />');
            htmlArr.push('<div  class="modal" style="position: absolute;z-index: 99;'+width+height+';left:0;float: left;top: 0;"></div>');
            g.getObj().html(htmlArr.join(""));
        },

        //创建蒙版中的标注。(wrapper)生成一个div并放入标注的img对象picObj。
        //返回该标注对象
        addMarker:function(x,y,picObj){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $modal = $picture.find(".modal");//找到蒙版
            var wrapper = $("<div style='position: absolute;' class='marker'/>");
            wrapper.bind("click",function(){
                g.selectedMarker = wrapper;
            }) ;
            wrapper.css({left: x,top: y});
            picObj.appendTo(wrapper);
            $modal.append(wrapper);
            if(p.isEdit){

                //编辑状态下包装成可dd的dom
                new Dragdrop({
                    target : wrapper[0] ,
                    area:[0,$picture.width()-wrapper.width(),0,$picture.height()-wrapper.height()]
                });
            }
            return wrapper;
        },

        //
        // 为界面元素增加操作事件功能
        //
        initEvent:function(){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $markObj = $("#"+p.markId);
            var $modal = $picture.find(".modal");

            //jq对象增加单击事件，用来增加标注对象
            $picture.click(function(e){
                if(g.getFlag()>0&& p.isEdit){ //编辑模式时才添加具体标注对象 //flag？难道是点击markid对象后的状态？
                    var target = $($markObj.find("img")[g.getFlag()-1]).clone(); //获取点击markObjdom对象（img）并复制一份。
                    //计算位置？
                    var left = e.clientX- $modal.parent()[0].offsetLeft;
                    var top = e.clientY-$modal.parent()[0].offsetTop;
                    //生成标注对象并包装标注图标
                    var wrapper = g.addMarker(left,top,target);
                    g.selectedMarker = wrapper;
                    g.setFlag( -1);

                    $picture.css({cursor:"pointer"}); //鼠标样式复原

                    //标注对象模板的src作为事件的参数，为标注对象增加双击事件
                    var url = target.attr("src");
                    var params = {x:left,y:top,url:url};
                    g.addDblEvent(wrapper,params); //为标注对象增加事件 （编辑模式时）
                }

            });

        },

        // 初始化标注对象模板工具
        initCursor:function(){
            var p = this.options;
            var g = this;
            var $picture = g.getObj(); //jq对象 标注板
            var $markObj = $("#"+p.markId);
            //增加标注对象模板的单击事件。设置状态，让鼠标可以在蒙版上增加标注。即鼠标选择的标注模板，准备在模板标注。
            $markObj.find("img").click(function(e){
                e.stopPropagation();
                g.setFlag($markObj.find("img").index($(this))+1) ;
                var src = $(this).attr("src");
                src = src.substring(0,src.lastIndexOf(".")+1)+"cur";
                $picture.css({cursor:"crosshair"}); //一旦点选标注模板则鼠标状态为十字样式
                if(p.hasSelfCur){ //使用用户设定的鼠标样式 
                    $picture.css({cursor:"url("+src+"),auto"});
                }
            });
        },

        //
        //获取数据
        loadData:function(){
            var p = this.options;
            var g = this;
            $.ajax({
                type:"post",
                url: p.markerUrl,
                dataType:"json",
                success:function(datas){

                    for(var i= 0;i<datas.length;i++){
                        var data = datas[i];
                        var $pic = $("<img src='"+data.url+"'/>") ;
                        var $wrap = g.addMarker(data.x,data.y,$pic);
                        if(!p.isEdit){
                            $wrap.click(function(){
                                if(p.viewClick){
                                    p.viewClick.call(this,$wrap,data);
                                }
                            })
                        }else{
                            g.addDblEvent($wrap,data) ;
                        }

                    }
                }
            });
        },

        //
        //可为标注对象增加双击事件
        //
        addDblEvent:function(wrapper,params){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $modal = $picture.find(".modal");

            //标注对象的双击事件
            wrapper.dblclick(function(){
                params.x = parseInt(wrapper.css("left"));
                params.y = parseInt(wrapper.css("top"));
                if(p.dblclick){ //自定义双击后的click。该部分更可以替换之后的hasDialoy的实现。内嵌弹出窗口是集成的默认实现。
                    p.dblclick.call(this,wrapper,params) ;
                    return;
                }
                if(! wrapper.attr("hasDialog")){
                    var dialog= $.artDialog({
                        title: p.popTitle,
                        width :p.popWidth,
                        height :p.popHeight,
                        left:parseInt($modal.parent()[0].offsetLeft)+(parseInt($picture.find("div").eq(0).width())-p.popWidth)/2,
                        top:parseInt($modal.parent()[0].offsetTop)+(parseInt($picture.find("div").eq(0).height())-p.popHeight)/2,
                        ok: function(){
                            if(p.okCallBack){
                                var $return = p.okCallBack.call(this);
                                if($return){
                                    wrapper.removeAttr("hasDialog");
                                    return true;
                                }
                            }
                            wrapper.removeAttr("hasDialog");
                        },cancel:function(){
                            wrapper.removeAttr("hasDialog");
                            if(p.cancelCallBack){
                                var $return = p.cancelCallBack.call(this);
                                if($return){
                                    wrapper.removeAttr("hasDialog");
                                    return true;
                                }
                            }
                            wrapper.removeAttr("hasDialog");
                        }
                    });
                    wrapper.attr("hasDialog",true);
                    //
                    var picPropertyUrl = g.getUrl();
                    for(var key in params){
                        picPropertyUrl +="&"+key+"="+params[key];
                    }
                    if(!p.frame){
                        $.ajax({
                            type:"post",
                            data:params,
                            url: g.getUrl(),
                            success:function(data){
                                dialog.content(data);
                            }
                        });
                    }else{
                        dialog.content("<iframe height='100%' width='100%' style='overflow:hidden' frameborder=0 src='"+picPropertyUrl+"'>");
                    }
                }

            })
        },

        //获取url的地址
        getUrl:function(){
            var p = this.options;
            var url = p.url;
            if(url.indexOf("?")>0){
                return url;
            }else{
                return url +"?";
            }
        },

        //用来获取设置标记板的状态，该状态是指用户点击标记对象模板后与一般状态的区别。-1标识一般状态 >0表示可以在标记板上单击增加标注。
        setFlag:function(value){
            this.flag = value;
        },
        getFlag:function(){
            return this.flag;
        },

        //用来获取设置jq对象，即标记板主体。
        setObj:function(obj){
            this.obj = obj;
        },
        getObj:function(){
            return this.obj;
        },
        /**
         * 获取标注信息 ，返回JSON数组
         * @return {Array}
         */
        getMarkerInfo:function(){
            var ret = [];
            var g = this;
            var $picture = g.getObj();
            var $modal = $picture.find(".modal");

            var $markers = $(".marker",$modal);
            var info;
            var $marker;
            for(var i=0;i<$markers.length;i++){
                info = {};
                $marker = $($markers[i]);
                info.x = parseInt($marker.css("left"));
                info.y = parseInt($marker.css("top"));
                info.url = $marker.find("img").attr("src");
                ret.push(info);
            }
            return ret;

        },
        deleteSelectedMarker:function(){
            var g = this;
            if(g.selectedMarker){
                g.selectedMarker.remove();
                g.selectedMarker = null;
            }

        }


    };

    //可拖拽dom对象包装
    Dragdrop = function(window){
        var doc = window.document;
        var E = {
            on : function(el, type, fn){
                el.addEventListener ?
                    el.addEventListener(type, fn, false) :
                    el.attachEvent ?
                        el.attachEvent("on" + type, fn) :
                        el['on'+type] = fn;
            },
            un : function(el,type,fn){
                el.removeEventListener ?
                    el.removeEventListener(type, fn, false) :
                    el.detachEvent ?
                        el.detachEvent("on" + type, fn) :
                        el['on'+type] = null;
            },
            evt : function(e){
                return e || window.event;
            }
        };
        return function(opt){
            var conf = null, defaultConf, diffX, diffY;
            function Config(opt){
                this.target = opt.target;
                this.bridge = opt.bridge;
                this.dragable = opt.dragable != false;
                this.dragX = opt.dragX != false;
                this.dragY = opt.dragY != false;
                this.area  = opt.area;
                this.callback = opt.callback;
            }
            function Dragdrop(opt){
                if(!opt){return;}
                conf = new Config(opt);
                defaultConf = new Config(opt);
                conf.bridge ?
                    E.on(conf.bridge,'mousedown',mousedown) :
                    E.on(conf.target,'mousedown',mousedown);
            }
            Dragdrop.prototype = {
                dragX : function(){
                    conf.dragX = true;
                    conf.dragY = false;
                },
                dragY : function(b){
                    conf.dragY = true;
                    conf.dragX = false;
                },
                dragAll : function(){
                    conf.dragX = true;
                    conf.dragY = true;
                },
                setArea : function(a){
                    conf.area = a;
                },
                setBridge : function(b){
                    conf.bridge = b;
                },
                setDragable : function(b){
                    conf.dragable = b;
                },
                reStore : function(){
                    conf = new Config(defaultConf);
                    conf.target.style.top = '0px';
                    conf.target.style.left = '0px';
                },
                getDragX : function(){
                    return conf.dragX;
                },
                getDragY : function(){
                    return conf.dragY;
                }
            };
            function mousedown(e){
                e = E.evt(e);
                var el = conf.target;
                el.style.position = 'absolute';
                el.style.cursor = 'move';
                if(el.setCapture){ //IE
                    E.on(el, "losecapture", mouseup);
                    el.setCapture();
                    e.cancelBubble = true;
                }else if(window.captureEvents){ //标准DOM
                    e.stopPropagation();
                    E.on(window, "blur", mouseup);
                    e.preventDefault();
                }
                diffX = e.clientX - el.offsetLeft;
                diffY = e.clientY - el.offsetTop;
                E.on(doc,'mousemove',mousemove);
                E.on(doc,'mouseup',mouseup);
            }
            function mousemove(e){
                var el = conf.target, e = E.evt(e), moveX = e.clientX - diffX, moveY = e.clientY - diffY;
                var minX, maxX, minY, maxY;
                if(conf.area){
                    minX = conf.area[0];
                    maxX = conf.area[1];
                    minY = conf.area[2];
                    maxY = conf.area[3];
                    moveX < minX && (moveX = minX); // left 最小值
                    moveX > maxX && (moveX = maxX); // left 最大值
                    moveY < minY && (moveY = minY); // top 最小值
                    moveY > maxY && (moveY = maxY); // top 最大值
                }
                if(conf.dragable){
                    conf.dragX && (el.style.left = moveX + 'px');
                    conf.dragY && (el.style.top =  moveY + 'px');
                    if(conf.callback){
                        var obj = {moveX:moveX,moveY:moveY};
                        conf.callback.call(conf,obj);
                    }
                }
            }
            function mouseup(e){
                var el = conf.target;
                el.style.cursor = 'default';
                E.un(doc,'mousemove',mousemove);
                E.un(doc,'mouseup',mouseup);
                if(el.releaseCapture){ //IE
                    E.un(el, "losecapture", mouseup);
                    el.releaseCapture();
                }
                if(window.releaseEvents){ //标准DOM
                    E.un(window, "blur", mouseup);
                }
            }
            return new Dragdrop(opt);
        }
    }(this);
})(jQuery);
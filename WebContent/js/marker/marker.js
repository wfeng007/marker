/**
 * Date: 14-1-12
 * Time: 下午8:22
 */
(function ($)
{
    var MarkerManager = {
        container:{}
    };
    MarkerManager.setMarker = function(id,marker){
        this.container[id] = marker;
    };

    MarkerManager.getMarker = function(id){
        return this.container[id];
    };

    $.fn.marker = function (options)
    {
        this.options = {
            data:null,                                    //本地渲染数据（坐标与标记图标的地址）
            url:"",                                         //远程数据url
            viwUrl:"",                                         //远程展示数据url
            picUrl:"",                                     //图片地址
            markerUrl:"",                                     //标注点 数据远程url
            picWidth:null,                                 //图片宽度
            picHeight:null,                                 //图片高度
            isEdit:false,                                  //设置为true，双击标注图标能进行属性编辑
            popWidth:200,                                  //弹出窗口宽度
            popHeight:200,                                 //弹出窗口内容高度
            popTitle:"标注坐标点",                        //弹窗标题
            hasSelfCur:false,                              //是否采用自定义cursor
            okCallBack:null,                               //弹窗确定按钮的回调函数，可添加保存数据功能
            markId:"",                                      //用来标注的图标容器ID
            frame:false,
            viewClick:null,
            cancelCallBack:null
        };
        $.extend(this.options,options);
        return $.marker.init(this);
    };

    $.fn.getMarker = function(){
        $(this).attr("id");
    };

    $.marker = {
        init:function(obj){
            var p = this.options = obj.options;
            var g = this;
            g.setObj(obj);
            g.setFlag(-1);
            g.createHtml();
            g.initCursor();
            g.initEvent();
            if( p.markerUrl){
                g.loadData();
            }
            return this;
        },
        createHtml:function(){
            var p = this.options;
            var g = this;
            var htmlArr = [];
            var width = p.picWidth?'width:'+ p.picWidth+'px;':'';
            var height = p.picHeight?'height:'+ p.picHeight+'px;':'';
            htmlArr.push('<div style="position: relative;'+width+ height+'">');
            htmlArr.push('<img src="'+ p.picUrl+'" style="'+width+height+'" />');
            htmlArr.push('<div  class="modal" style="position: absolute;z-index: 99;'+width+height+';left:0;float: left;top: 0;"></div>');
            g.getObj().html(htmlArr.join(""));
        },
        addMarker:function(x,y,picObj){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $modal = $picture.find(".modal");
            var wrapper = $("<div style='position: absolute;'/>");
            wrapper.css({left: x,top: y});
            picObj.appendTo(wrapper);
            $modal.append(wrapper);
            if(p.isEdit){
                new Dragdrop({
                    target : wrapper[0] ,
                    area:[0,$picture.width()-wrapper.width(),0,$picture.height()-wrapper.height()]
                });
            }
            return wrapper;
        },
        initEvent:function(){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $markObj = $("#"+p.markId);
            var $modal = $picture.find(".modal");

            $picture.click(function(e){
                if(g.getFlag()>0&& p.isEdit){
                    var target = $($markObj.find("img")[g.getFlag()-1]).clone();
                    var left = e.clientX- $modal.parent()[0].offsetLeft;
                    var top = e.clientY-$modal.parent()[0].offsetTop;
                    var wrapper = g.addMarker(left,top,target);
                    g.setFlag( -1);
                    $picture.css({cursor:"pointer"});
                    var url = target.attr("src");
                    var params = {x:left,y:top,url:url};
                    g.addDblEvent(wrapper,params);
                }

            });
        },
        initCursor:function(){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $markObj = $("#"+p.markId);
            $markObj.find("img").click(function(e){
                e.stopPropagation();
                g.setFlag($markObj.find("img").index($(this))+1) ;
                var src = $(this).attr("src");
                src = src.substring(0,src.lastIndexOf(".")+1)+"cur";
                $picture.css({cursor:"crosshair"});
                if(p.hasSelfCur){
                    $picture.css({cursor:"url("+src+"),auto"});
                }
            });
        },
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
        addDblEvent:function(wrapper,params){
            var p = this.options;
            var g = this;
            var $picture = g.getObj();
            var $modal = $picture.find(".modal");
            wrapper.dblclick(function(){
                params.x = parseInt(wrapper.css("left"));
                params.y = parseInt(wrapper.css("top"));
                if(p.dblclick){
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
        getUrl:function(){
            var p = this.options;
            var url = p.url;
            if(url.indexOf("?")>0){
                return url;
            }else{
                return url +"?";
            }
        },
        setFlag:function(value){
            this.flag = value;
        },
        getFlag:function(){
            return this.flag;
        },
        setObj:function(obj){
            this.obj = obj;
        },
        getObj:function(){
            return this.obj;
        }

    };

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
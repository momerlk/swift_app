import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, Animated, PanResponder, Dimensions, Image, ImageBackground, Pressable } from 'react-native';
import Button from "../components/Button";
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Appearance, ColorSchemeName, ActivityIndicator, Modal, PanResponderInstance, GestureResponderEvent, PanResponderGestureState, TouchableWithoutFeedback} from 'react-native';
import * as size from "react-native-size-matters"
import { TouchableHighlight } from 'react-native-gesture-handler';
import { AntDesign, Ionicons, Entypo, EvilIcons} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DropDownPicker from 'react-native-dropdown-picker';



const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const fetchFonts = () => {
  return Font.loadAsync({
    'Poppins': require('../assets/fonts/Poppins-Medium.ttf'),
    'Montserrat': require('../assets/fonts/Montserrat.ttf'),
  });
};

const Users = [{}]

interface AppState {
  currentIndex: number;
  cards: any[];
  socket: WebSocket;
  loading : boolean;
  modalVisible : boolean;
  shareVisible : boolean;
  likeOpacity: number;
  dislikeOpacity: number;
  superLikeOpacity: number;
  width : number,
  height : number,
}

// Function to ensure URLs have the correct scheme
const ensureURLScheme = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export default class App extends React.Component<{}, AppState> {
  position: Animated.ValueXY;
  rotate: Animated.AnimatedInterpolation<string>;
  direction : string;
  nextCardOpacity: Animated.AnimatedInterpolation<number>;
  nextCardScale: Animated.AnimatedInterpolation<number>;
  PanResponder: PanResponderInstance;
  startTime : number;
  endTime : number;
  lastTap: number | null;
  tapTimeout: NodeJS.Timeout | null;
  

  constructor(props: any) {
    super(props);

    this.position = new Animated.ValueXY();

    this.rotate = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-30deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });


    this.nextCardOpacity = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [1, 0.8, 1],
      extrapolate: 'clamp',
    });

    this.nextCardScale = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [1, 0.8, 1],
      extrapolate: 'clamp',
    });

    this.state = {
      currentIndex: 0,
      cards: Users,
      socket: new WebSocket("http://192.168.18.16:9001/feed"),
      loading : true,
      modalVisible : false,
      shareVisible : false,
      likeOpacity : 0,
      superLikeOpacity : 0,
      dislikeOpacity : 0,
      height : 0,
      width : 0,
    };

    this.direction = "none";

    // Pan Responder for handling taps and swipes
    this.startTime = 0;
    this.endTime = 0;
    this.lastTap = null;
    this.tapTimeout = null;

    this.PanResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => true,
      onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        this.startTime = new Date().getTime();
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        this.position.setValue({ x: gestureState.dx, y: gestureState.dy });
        const dx = gestureState.dx;
        const dy = gestureState.dy;

        // TODO : optimise the number of renders even more
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal movement
          if (dx > 70) {
            const newDirection = 'right';
            if (this.direction !== newDirection){
              this.setState({likeOpacity : 1, dislikeOpacity : 0, superLikeOpacity : 0})
            }
          } else if (dx < -70) {
            const newDirection = 'left';
            if (this.direction !== newDirection){
              this.setState({likeOpacity : 0, dislikeOpacity : 1, superLikeOpacity : 0})
            }
          }
        } else {
          // Vertical movement
          if (dy > 110) {
            const newDirection = 'down';
          } else if (dy < -110) {
            const newDirection = 'up';
            if (this.direction !== newDirection){
              this.setState({likeOpacity : 0, dislikeOpacity : 0, superLikeOpacity : 1})
            }
          }
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        this.endTime = new Date().getTime();
        const timeDiff = this.endTime - this.startTime;
        this.setState({likeOpacity : 0, dislikeOpacity : 0, superLikeOpacity : 0})


        // Detect tap if movement is minimal
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5 && timeDiff < 200) {
          this.handleTap();
        } else {
          this.handleSwipe(gestureState);
        }
      },
    });

  }


  async componentDidMount() {
    await fetchFonts();
    try {
      const value = await AsyncStorage.getItem("authenticated");
      if (value === null || value === "false") {
        //router.navigate("/welcome");
      }
    } catch (e) {
      alert(`error = ${e}`);
    }

    setTimeout(async () => {
      // connecting to feed websocket
      const socket = new WebSocket("ws://192.168.18.16:9001/feed");

      socket.onmessage = (ev: MessageEvent<any>) => {
        const parsed = JSON.parse(ev.data);
        // no products
        // TODO : Create an error logger system which logs errors users face
        if (parsed["products"] === undefined && parsed["status"] !== 200) {
          if (parsed["message"] === "Invalid token"){
            router.replace("/sign-in")
            return;
          }
          else {
            alert(`failed to get new recommendations, message = ${parsed["message"]}`);
            return;
          }
        }

        if (parsed === null || parsed === undefined) {
          return;
        }
        if (parsed["products"] === null || parsed["products"] == undefined) {
          return;
        }

        let products = parsed["products"];

        if (products === undefined) {
          this.setState({ currentIndex: 0 })
        } else {
          Image.getSize(
            products[0].image_url,
            (width, height) => {
              const aspectRatio = width / height;
            
            // TODO : optimise these calculations
            // Calculate the adjusted width based on the fixed height
            const adjustedWidth = aspectRatio * size.verticalScale(620);
            this.setState({ height : size.verticalScale(620) , width : adjustedWidth});
            },
            (error) => {
              console.error('Failed to get image size', error);
            }
          );
          this.setState({ currentIndex: 0, cards: products });
        }

        this.setState({loading : false})
      };

      this.setState({ socket: socket });
    }, 500);

    let token = null; // token null before loading
    try {
      token = await AsyncStorage.getItem("token");
      // no token so returns user to sign in again
      if (token == null) {
        alert(`failed to get authentication token, sign in again!`)
        router.replace("/sign-in");
        return;
      }
    } catch (e) {
      alert(`failed to get authentication token, sign in again!`)
      router.replace("/sign-in");
      return;
    }

    setTimeout( // initial authentication to socket
      () => {
        try {
        this.state.socket.send(JSON.stringify({
            token: token,
            action_type: "open" // handshake/webscoket open action
        }))
        } catch (e){
            alert(`failed to connect, error = ${e}`)
        }
    
    }, 1000)
  }

  

  async handleSwipeAction(action: string) {
    let token = null;
    try {
      token = await AsyncStorage.getItem("token")
    } catch (e) {
      alert(`failed to update feed, reload or login again , error = ${e}`)
    }
    this.state.socket.send(JSON.stringify({
      token: token,
      action_type: action,
      action_timestamp: new Date().toJSON(),
      product_id: this.state.cards[this.state.currentIndex]["product_id"],
    }))
  }

  handleSwipe = (gestureState: any) => {
    if (gestureState.dx > 120) {
      // Swipe right
      Animated.spring(this.position, {
        toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
        useNativeDriver: true,
      }).start(() => {
        this.setState(
          { currentIndex: this.state.currentIndex + 1 },
          async () => {
            this.position.setValue({ x: 0, y: 0 });
            await this.handleSwipeAction("like");
          }
        );
      });
    } else if (gestureState.dx < -120) {
      // Swipe left
      Animated.spring(this.position, {
        toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
        useNativeDriver: true,
      }).start(() => {
        this.setState(
          { currentIndex: this.state.currentIndex + 1 },
          async () => {
            this.position.setValue({ x: 0, y: 0 });
            await this.handleSwipeAction("dislike");
          }
        );
      });
    } else if (gestureState.dy < -120) {
      // Swipe up
      Animated.spring(this.position, {
        toValue: { x: gestureState.dx, y: -SCREEN_HEIGHT - 100 },
        useNativeDriver: true,
      }).start(() => {
        this.setState(
          { currentIndex: this.state.currentIndex + 1 },
          async () => {
            this.position.setValue({ x: 0, y: 0 });
            await this.handleSwipeAction("added_to_cart");
          }
        );
      });
    } else {
      // Reset position if no significant swipe
      Animated.spring(this.position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
    }
  }

  // TODO : tap to scroll between between image and video of the product Eureka :)
  handleTap(){
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 500;

    if (this.lastTap && (now - this.lastTap) < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
      }
      // console.log(`double tap detected`)
      router.navigate({
        pathname: "/details",
        params: this.state.cards[this.state.currentIndex]
      })
    } else {
      // Single tap detected, wait to confirm if it is a double tap
      this.lastTap = now;
      this.tapTimeout = setTimeout(() => {
        // console.log(`single tap detected`);
      }, DOUBLE_PRESS_DELAY);
    }
  }

  ItemCard(props: any){
    const item = props.item;
    const height = size.verticalScale(610);
    const textHeight = size.verticalScale(220);
    return (
      <ImageBackground
              style={{
                height : height, 
              }}
              imageStyle={{
                borderTopLeftRadius : 20,
                borderTopRightRadius : 20,
              }}
              source={{ uri: ensureURLScheme(item.image_url) }}
            >
              <LinearGradient colors={["transparent" , "rgba(0,0,0,0.4)"]} style={{
                marginTop : height - textHeight , 
                height : textHeight,
                // backgroundColor : "rgba(52, 52, 52, 0.3)",
                
              }}
                >
                  <View style={{marginTop : size.verticalScale(85),}}>
                 <Text style={{
                  color : "white",
                  marginHorizontal : 10,
                  fontSize : 17,
                  fontFamily : "Poppins"
                  }}>{shortTitle(item.title as string)}</Text> 
                <View style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginHorizontal: 10,
                }}>
                  
                  <Text style={{
                    fontSize: 22, fontFamily: "Poppins",
                    color : "white"
                  }}>{toTitle(item.vendor as string)}</Text>
                  <Text style={{
                    fontSize: 22, marginVertical: 5,
                    color : "white",
                    fontFamily : "Poppins",
                  }}>Rs. {(() => {
                      let l = item.price.length;
                      let pos = (l) - 3;
                      if (pos > 0) {
                        const firstPart = item.price.slice(0, pos);
                        const secondPart = item.price.slice(pos);

                        // Concatenate the first part, substring, and second part
                        const newString = firstPart + "," + secondPart;
                        return newString;
                      } else {
                        return item.price
                      }
                    })()}</Text>
                </View>
                </View>
              </LinearGradient>
            </ImageBackground>
    )
  }

  renderProducts = () => {
    const rotate = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-5deg', '0deg', '5deg'],
      extrapolate: 'clamp',
    });
    return this.state.cards.map((item, i) => {
      if (i < this.state.currentIndex) {
        return null;
      } else if (i === this.state.currentIndex) {
        return (
          <Animated.View
            {...this.PanResponder.panHandlers}

            key={item.product_id}
            style={[
              {
                transform: [
                  { translateX: this.position.x },
                  { translateY: this.position.y },
                  { rotate: rotate },
                ],
              },
              {
                height: SCREEN_HEIGHT - 120,
                width: SCREEN_WIDTH,
                padding: 10,
                position: 'absolute',
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: this.state.likeOpacity,
                position: 'absolute',
                left : 10,
                zIndex: 1000,
                width : this.state.width,
                height : size.verticalScale(630),
              }}
            >
              <LinearGradient colors={["transparent" , "rgba(0,0,0,0.65)"]} style={{
                
                flex : 1,
                
              }}
                >
                  <EvilIcons name="heart" size={140} color="white" style={{
                    position : "absolute",
                    top : (SCREEN_HEIGHT * 0.5) - 100,
                    left : (SCREEN_WIDTH * 0.6) - 120,
                  }}/>
               
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={{
                opacity: this.state.dislikeOpacity,
                position: 'absolute',
                zIndex: 1000,
                width : this.state.width + 10,
                height : size.verticalScale(630),
              }}
            >
              <LinearGradient colors={["transparent" , "rgba(0,0,0,0.65)"]} style={{
                
                flex : 1,
                
              }}
                >
                  {/* Find a good cross icon */}
                  <AntDesign name="dislike2" size={100} color="white" style={{
                    position : "absolute",
                    top : (SCREEN_HEIGHT * 0.5) - 100,
                    left : (SCREEN_WIDTH * 0.6) - 100,
                  }}/>
               
              </LinearGradient>
            </Animated.View>


            <Animated.View
              style={{
                opacity: this.state.superLikeOpacity,
                position: 'absolute',
                zIndex: 1000,
                width : SCREEN_WIDTH,
                height : size.verticalScale(622),
              }}
            >
              <LinearGradient colors={["transparent" , "rgba(0,0,0,0.65)"]} style={{
                
                flex : 1,
                
              }}
                >
                  <AntDesign name="shoppingcart" size={100} color="white" style={{
                    position : "absolute",
                    top : (SCREEN_HEIGHT * 0.5) - 100,
                    left : (SCREEN_WIDTH * 0.6) - 100,
                  }}/>
               
              </LinearGradient>
            </Animated.View>   

            <this.ItemCard item={item}/>
          </Animated.View>
        );
      } else {
        return (
          <Animated.View
            key={item.product_id}
            style={[
              {
                opacity: this.nextCardOpacity,
                transform: [{ scale: this.nextCardScale }],
                height: SCREEN_HEIGHT - 120,
                width: SCREEN_WIDTH,
                padding: 10,
                position: 'absolute',
              },
            ]}
          >
            <this.ItemCard item={item}/>
          </Animated.View>
        );
      }
    }).reverse();
  };

  render() {
    if(this.state.loading){
        return <View style={{flex : 1,backgroundColor : "black", paddingTop : 30, paddingLeft : 10}}>
            
            <ActivityIndicator style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: [{ translateX: -50 }, { translateY: -50 }],
            }} size={60} color="white"/>
        </View>
    } else {
    return (
      <View style={{ flex: 1,backgroundColor: "black", paddingTop : SCREEN_HEIGHT * 0.042}}>
        <View style={{ flex: 1 }}>{this.renderProducts()}</View>
        <Filter 
          modalVisible={this.state.modalVisible} 
          setModalVisible={(v: boolean) => this.setState({modalVisible : v})}
        />
        <Sharing 
          modalVisible={this.state.shareVisible} 
          setModalVisible={(v: boolean) => this.setState({shareVisible : v})}
        />
        <View style={{
          display : "flex", flexDirection : "row", 
          bottom : size.verticalScale(10),
          justifyContent : "space-evenly",
          }}>
          <Pressable style={{
              marginHorizontal: 15,
              width: size.scale(45),
              height: size.scale(47),
              borderRadius: size.scale(25), // Half of the width/height to make it a circle
              backgroundColor: "white",
              justifyContent: "center", // Center vertically
              alignItems: "center", // Center horizontally
            }}
            onPress={() => {
                // TODO : Add undo swipe/action functionality limit of 2 undos
                alert(`undid to the previous product`)
            }} 
            >
                <Ionicons name="refresh" size={size.scale(26)} color="black" />
            </Pressable>


            <Pressable style={{
              marginHorizontal: 20,
              width: size.scale(60),
              height: size.scale(60),
              borderRadius: size.scale(30), // Half of the width/height to make it a circle
              backgroundColor: "white",
              justifyContent: "center", // Center vertically
              alignItems: "center", // Center horizontally
            }}
            onPress={() => {
                // TODO : Add filter functionality
                this.setState({modalVisible : true})
            }} 
            >
                <Ionicons name="filter-sharp" size={size.scale(30)} color="black" />
            </Pressable>
          {/* <Pressable style={{
              marginHorizontal: 20,
              width: size.scale(60),
              height: size.scale(60),
              borderRadius: size.scale(30), // Half of the width/height to make it a circle
              backgroundColor: "white",
              justifyContent: "center", // Center vertically
              alignItems: "center", // Center horizontally
            }}
            onPress={() => {
              router.navigate({
                pathname: "/details",
                params: this.state.cards[this.state.currentIndex]
              })
            }} 
            >
              <Entypo name="magnifying-glass" size={size.scale(40)} color="black" />
            </Pressable> */}
          <Pressable style={{
              marginHorizontal: 15,
              width: size.scale(45),
              height: size.scale(45),
              borderRadius: size.scale(25), // Half of the width/height to make it a circle
              backgroundColor: "white",
              justifyContent: "center", // Center vertically
              alignItems: "center", // Center horizontally
            }}
            onPress={() => {
                // TODO : add share functionality 
                // this.setState({shareVisible : true})

                // TODO : shows details for now change this
                router.navigate({
                  pathname: "/details",
                  params: this.state.cards[this.state.currentIndex]
                })
            }} 
            >
              <Entypo name="paper-plane" size={size.scale(26)} color="black" />
            </Pressable>
        </View>
      </View>
    );
    }
  }
}

interface ModalProps {
  setModalVisible : Function;
  modalVisible : boolean;
}

function DropDown(props : any){
  const [open , setOpen] = useState(false);
  const [value , setValue] = useState(null);
  const [items, setItems] = useState(props.data);

  return (
    <View style={{
      marginHorizontal : size.scale(20), 
      marginVertical : size.verticalScale(15),
      zIndex : open ? 3000 : 1,
    }}>
   
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        onChangeValue={props.onChange}
        
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        searchable={props.searchable}
        textStyle={{
          fontFamily: "Poppins",
          fontSize: size.scale(14),
        }}
        placeholder={props.title}
        placeholderStyle={{
          fontWeight: "semibold",
          fontSize: size.scale(15),
        }}

      />
    </View>
  )
}

function Filter(props : ModalProps){
  // TODO : Add dropdown data to the state of the filter
  return (
    
     <Modal
        animationType="none"
        transparent={true}
        visible={props.modalVisible}
        onRequestClose={() => {
          props.setModalVisible(!props.modalVisible);
        }}
           
      >
        <View 
          style={{
            backgroundColor : "#121212",
            flex : 1,
            marginBottom: size.verticalScale(140),
            marginTop : size.verticalScale(70),
            marginHorizontal : 20,
            borderRadius : 8,
          }}
        >
            <Text style={{color : "white", fontSize : 30, alignSelf : "center", fontFamily : "Poppins", marginTop: 20,}}>
              FILTER
            </Text>
            {/*TODO : Get dropdown data from backend
            TODO : Send this filter data to server  */}
            <DropDown 
              data={[
                {label: 'Clothes', value: 'clothes'},
                {label: 'Shoes', value: 'shoes'},
                {label: 'Acessories', value: 'accessories'}
              ]} 
              title="Category"
              onChange={(t : any) => alert(`changed to ${t}`)}
              searchable={false}
            />     

            <DropDown 
              data={[
                {label: 'Afrozeh', value: 'afrozeh'},
                {label: 'Sana Safinaz', value: 'sana_safinaz'},
                {label : "Bonanza Satrangi" , value : "bonanza_satrangi"}
              ]} 
              title="Brands"
              onChange={(t : any) => alert(`changed to ${t}`)}
              searchable={true}
            />

            <DropDown 
              data={[
                {label: 'Blue', value: 'blue'},
                {label: 'Red', value: 'red'}
              ]} 
              title="Color"
              onChange={(t : any) => alert(`changed to ${t}`)}
              searchable={false}
            />  

            <DropDown 
              data={[
                {label: 'Rs. 0 - 5000', value: 'RS_0_5000'},
                {label: 'Rs. > 5000', value: 'RS_5000_1000'}
              ]} 
              title="Price Range"
              onChange={(t : any) => alert(`changed to ${t}`)}
              searchable={false}
            />       

            <Pressable
              style={[
                {
                  paddingBottom: 16,
                  paddingVertical: 10,
                  paddingTop : 15,
                  marginHorizontal : 14,
                  marginTop : 20,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf : "center",
                  width : size.scale(200),
                  position : "absolute",
                  bottom : 40,
                },
                { backgroundColor: "white" },
              ]}
              onPress={() => props.setModalVisible(false)}
            >
              <Text style={{ fontSize: 18, color: "black", fontFamily : "Poppins" }}>
                Confirm
              </Text>
            </Pressable>
            </View>
      </Modal>
   
  )
}

function Sharing(props : ModalProps){
  // TODO : Implement swipe to bring down like instagram
  return (
    
     <Modal
        animationType="slide"
        transparent={true}
        visible={props.modalVisible}
        onRequestClose={() => {
          props.setModalVisible(false);
        }}
        onDismiss={() => {
          props.setModalVisible(false);
        }}
        onAccessibilityEscape={() => {
          props.setModalVisible(false);
        }}


           
      >
        <Pressable 
            style={{position : "absolute" , bottom : SCREEN_HEIGHT * 0.4, height : SCREEN_HEIGHT, backgroundColor : "transparent", width : SCREEN_WIDTH}} 
            onPress={() => props.setModalVisible(false)}
          ></Pressable> 
        <View 
          style={{
            backgroundColor : "#121212",
            flex : 1,
            marginTop : SCREEN_HEIGHT * 0.6,
            borderTopLeftRadius : 30,
            borderTopRightRadius : 30,
          }}
        >
            <Text style={{color : "white", fontSize : 30, alignSelf : "center", fontFamily : "Poppins", marginTop: 20,}}>
              SHARE
            </Text>
            {/* <Pressable
              style={[
                {
                  paddingBottom: 16,
                  paddingVertical: 10,
                  paddingTop : 15,
                  marginHorizontal : 14,
                  marginTop : 20,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf : "center",
                  width : size.scale(200),
                  position : "absolute",
                  bottom : 40,
                },
                { backgroundColor: "white" },
              ]}
              onPress={() => props.setModalVisible(false)}
            >
              <Text style={{ fontSize: 18, color: "black", fontFamily : "Poppins" }}>
                Confirm
              </Text>
            </Pressable> */}
            </View>
      </Modal>
   
  )
}


function toTitle(str : string) : string {
  if (str === undefined){
    return ""
  }
  str = str.replaceAll("_" , " ");
  const words = str.split(" ");
  for (let i = 0; i < words.length; i++) {
    try {
      words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    } catch(e){
      return ""
    }
  }

  return words.join(" "); 
}

function shortTitle(str : string) : string {
  if (str === undefined){
    return ""
  }
  
  const strTitle = toTitle(str);
  str = (strTitle == "") ? str : strTitle;

  const words = str.split(" ");
  if(words.length < 3){
    return str;
  }

  let three_words = [];

  for(let i = 0;i < 3;i++){
    if (words[i][0] === "("){
      continue;
    }
    three_words.push(words[i])
  }
  return three_words.join(" ") + " ..." 
}
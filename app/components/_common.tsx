import { router } from "expo-router";
import React , {useState , useEffect} from "react"
import {Text , Image , Pressable , 
  View, ActivityIndicator, TouchableOpacity,
  ScrollView,Modal,Platform,Dimensions,
  FlatList,
  TextInput,
  StyleSheet
} from "react-native"
import {Ionicons, AntDesign} from "@expo/vector-icons"
import { PrimaryButton, SecondaryButton} from "./button";

import { tabBarHeight } from "../(tabs)/_layout";
import * as size from "react-native-size-matters"
import * as api from "../backend/api"

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

import { Image as FastImage } from "expo-image"
import { storage , getObject, setObject } from "../backend/storage";


const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

export class FastImageBackground extends React.Component<any , any> {
  render() {
    const { children , style = {}, imageStyle, ...props } = this.props

    return (
      <View style={style}>
        <FastImage
          {...props}
          style={[
            StyleSheet.absoluteFill,
            {
              width: style.width,
              height: style.height,
            },
            imageStyle,
          ]}
          placeholder={{ blurhash }}
        />
        {children}
      </View>
    )
  }
}


export function Logo(){
  const topMargin = 42;
    return (
    <>
        <Image  source={require("../assets/juno_text.png")} style={{
          position : "absolute",
          marginTop : topMargin,
          left : 20,
          height : 60, 
          width : 100, 
          resizeMode : "cover", 
          alignSelf : "center", 
        }} 
          />

      

    </>
    )
}

interface BackProps {
  text : string;
}
export function Back(props : BackProps ){
  return (
    <>
    <Pressable onPress={() => router.back()} style={{
      display : "flex" , flexDirection : "row", marginBottom : 7, marginTop : 20 , paddingTop : 20
      }}>
      <View  
        style={{
          left : 10,
          top : 10,
          marginBottom : 10,
          }} >
          <Ionicons name="arrow-back" size={32} color="white"/>
      </View>
      <Text 
        style={{
          color : "white", 
          fontFamily : "Poppins_400Regular", 
          fontSize : 22 , 
          marginLeft : 20,
          marginTop : 10,
        }} >
          {props.text}
      </Text>
    </Pressable>
    </>
  )
}

export function Loading(){
  return (
    <View style={{flex : 1,backgroundColor : "black", paddingTop : 40, paddingLeft : 20}}>
            
            <ActivityIndicator style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: [{ translateX: -50 }, { translateY: -50 }],
            }} size={60} color="white"/>
        </View>
  )
}

interface TrimResult {
    trimmedArray: any[];
    updatedIndex: number;
}

export function trimArray(array: any[], currentIndex: number): TrimResult {
  const minItemsBefore = 10;
  const minItemsAfter = 40;

  // Ensure array is at least 50 items long
  if (array.length < 50) {
      return {
          trimmedArray: array,
          updatedIndex: currentIndex
      };
  }

  // Calculate start and end indices for the trimmed array
  let start = currentIndex - minItemsBefore;
  let end = currentIndex + minItemsAfter;

  // Adjust start and end indices if they exceed array boundaries
  if (start < 0) {
      start = 0;
  }
  if (end > array.length) {
      end = array.length;
  }

  // Get the trimmed array slice
  const trimmedArray = array.slice(start, end);

  // Calculate updated index based on trimming
  const updatedIndex = currentIndex - start;

  // Return the trimmed array and updated index
  return {
      trimmedArray: trimmedArray,
      updatedIndex: updatedIndex
  };
}


export function toTitle(str: string | undefined): string {
  if (!str) {
    return "";
  }

  // Remove apostrophes and replace underscores with spaces
  str = str.replace(/'/g, "").replace(/_/g, " ");
  str = str.toLowerCase();

  // Split the string into words and capitalize the first letter of each word
  const words = str.split(" ").filter(word => word.length > 0); // Filter out empty words

  for (let i = 0; i < words.length; i++) {
    // Capitalize the first letter of each word
    words[i] = words[i][0].toUpperCase() + words[i].slice(1);
  }

  return words.join(" ");
}

export function shortTitle(str : string) : string {
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
  let res = three_words.join(" ") + " ..." 
  if (res.length > 19){
    res = res.substring(0,18) + " ...";
  }
  return res
}

export function fmtPrice(priceN : number){
  const price = priceN.toString();
  let l = price.length;
  let pos = (l) - 3;
  if (pos > 0) {
    const firstPart = price.slice(0, pos);
    const secondPart = price.slice(pos);

    // Concatenate the first part, substring, and second part
    const newString = firstPart + "," + secondPart;
    return newString;
  } else {
    return price
  }
}



/**
 * Asynchronous timeout function
 * @param ms - The number of milliseconds to wait
 * @returns A Promise that resolves after the specified time
 */
export const asyncTimeout = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


interface DropDownProps {
  data: { label: string; value: any }[];
  type?: 'range' | "standard" | string;
  range?: any;
  selected : any | null;
  onChange?: Function;
  onPress? : Function;
  containerStyle? : object;
  buttonStyle?: object;
  textStyle?: object;
  title: string;
  multiple?: boolean;
}

export const DropDown: React.FC<DropDownProps> = ({ data, type, range, selected, onChange, containerStyle, buttonStyle, textStyle, title, multiple = false } : any) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<any[]>([]);
  const [items, setItems] = useState(data);
  const [lower, setLower] = useState("");
  const [upper, setUpper] = useState("");

  useEffect(() => {
    if (type === "range" && selected !== null){   
      if(selected.lower !== null && selected.upper !== null){
        setValue([lower,upper])
        setLower(lower)
        setUpper(upper)
      }
      else if (selected.lower !== null) {
        setLower(selected.lower)
        setValue([lower])
      }
      else if (selected.upper !== null) {
        setUpper(selected.upper)
        setValue([upper])
      }
    } else if (selected !== null){
      setValue(selected)
    }
  } , []) 

  const SCREEN_HEIGHT = Platform.OS === "ios" || Platform.OS === "android" ? 800 : 600; // Mock screen height
  const tabBarHeight = 50; // Mock tab bar height

  const marginTop = SCREEN_HEIGHT * 0.22;
  const marginBottom = (SCREEN_HEIGHT * 0.22) + tabBarHeight;

  const handleSelect = (itemValue: any, isSelected: boolean, isMin: boolean) => {
    if (isSelected) {
      if (isMin) {
        setLower("");
        setValue([upper]);
        onChange("", upper);
      } else {
        setUpper("");
        setValue([lower]);
        onChange(lower, "");
      }
    } else {
      if (isMin) {
        setLower(itemValue);
        setValue([itemValue, upper]);
        onChange(itemValue, upper);
      } else {
        setUpper(itemValue);
        setValue([lower, itemValue]);
        onChange(lower, itemValue);
      }
    }
  };

  const handleSelectSingle = (itemValue: any) => {
    setValue([itemValue]);
    onChange([itemValue]);
  };

  const renderRangeItem = ({ item }: { item: {label: string; value: any } }, isMin: boolean) => {
    const isSelected = (isMin ? lower : upper) === item.value;
    return (
      <TouchableOpacity
        key={item.value}
        style={{
          backgroundColor: "#222222",
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRadius: 5,
          marginVertical: 3,
          zIndex: 6000,
        }}
        onPress={() => handleSelect(item.value, isSelected, isMin)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 17, color: "white", fontFamily: "Poppins_400Regular" }}>
            {item.label}
          </Text>
          {isSelected && <AntDesign name="check" size={20} color="white" style={{ marginTop: 3 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: {image : string | undefined , label: string; value: any } }) => {
    const isSelected = value.includes(item.value);
    return (
      <TouchableOpacity
        key={item.value}
        style={{
          backgroundColor: "#222222",
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRadius: 5,
          marginVertical: 5,
          zIndex: 6000,
        }}
        onPress={() => {
          if (multiple) {
            const newValue = isSelected ? value.filter(v => v !== item.value) : [...value, item.value];
            setValue(newValue);
            onChange(newValue);
          } else {
            handleSelectSingle(item.value);
            setOpen(false);
          }
        }}
      > 
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>

          <View style={{
            display : "flex",
            flexDirection : "row",
          }}>

            {item.image !== undefined ?
            <Image source={{uri : item.image}} 
            style={{
              height: 40,
              width: 40,
              borderRadius: 50,
              marginTop: 3,
              marginRight: 7,
              backgroundColor : "white",
            }}/> 
            : <></>}

            <Text style={{ fontSize: 17, marginTop : 8, marginLeft : 4, color: "white", fontFamily: "Poppins_400Regular" }}>
              {item.label}
            </Text>
          </View>

          {isSelected && <AntDesign name="check" size={20} color="white" style={{ marginTop: 8 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  // ref for the searchable component to fix focus issue on android
  const searchInputRef = React.useRef<any>(null);
  const [brandQuery , setBrandQuery] = useState("")

  return (
    <View style={[{ marginHorizontal: size.scale(20), marginBottom: 16 }, containerStyle]}>
      <Modal
        animationType="none"
        transparent={true}
        visible={open}
        onRequestClose={() => setOpen(!open)}
        onShow={() => {
          setTimeout(() => {
            // searchInputRef.current?.blur();
            // searchInputRef.current?.focus();
          }, 100)
        }}
      >
        <View style={{
          zIndex: open ? 4000 : 1,
          backgroundColor: "#121212",
          flex: 1,
          marginTop: marginTop,
          marginBottom: marginBottom,
          marginHorizontal: size.scale(35),
          paddingHorizontal: 20,
          borderRadius: 8,
          paddingVertical: 30,
        }}>
          {type === "range" ? (
            <>
              <Text style={{ marginVertical: 0, fontSize: 17, fontFamily: "Poppins_400Regular", color: "white", textAlign: "center" }}>
                Min
              </Text>
              <FlatList
                data={range?.min}
                renderItem={(item) => renderRangeItem(item, true)}
                keyExtractor={(item) => item.value}
              />
              <Text style={{ marginVertical: 5, fontSize: 17, fontFamily: "Poppins_400Regular", color: "white", textAlign: "center" }}>
                Max
              </Text>
              <FlatList
                data={range?.max}
                renderItem={(item) => renderRangeItem(item, false)}
                keyExtractor={(item) => item.value}
              />
            </>
          ) : (
            <>
            {type === "searchable" && Platform.OS !== "android"? 
              <TextInput 
                style={{
                  borderStyle : "solid",
                  borderWidth : 2,
                  borderColor : "white",

                  color : "white",

                  marginBottom : 10,
                  paddingVertical : 10,
                  paddingHorizontal : 10,
                  fontSize : 20,
                }}
                value={brandQuery}
                onChangeText={v => {
                  setBrandQuery(v)
                }}
                placeholder={`Search brands`}
                placeholderTextColor={"gray"}
              /> 
            : <></>}
            <FlatList
              data={(() => {
                if (brandQuery === ""){
                  return items;
                } else {
                  const itemsArr = items as Array<any>;
                  return itemsArr.filter(item => api.fuzzysearch(brandQuery , item.label)) 
                }
              })()}
              showsVerticalScrollIndicator={true}
              renderItem={renderItem}
              keyExtractor={(item) => item.value.toString()}
            />
            </>
          )}
          <PrimaryButton
            text="Confirm"
            onPress={() => {
              setOpen(false);
              if (type === "range") {
                onChange(lower, upper);
              }
            }}
            style={{ paddingVertical: 5, fontSize: 5 }}
          />
        </View>
      </Modal>

      <TouchableOpacity
        style={[{
          backgroundColor: "white",
          width: size.scale(250),
          paddingHorizontal: 10,
          paddingVertical: size.verticalScale(10),
          borderRadius: 10,
        }, buttonStyle]}
        onPress={() => setOpen(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <View style={{
            height: 22,
            width: 22,
            borderRadius: 50,
            marginTop: 3,
            marginRight: 7,
            backgroundColor: "black"
          }}>
            {value.length !== 0 && <AntDesign name="check" size={14} color="white" style={{ margin: 4 }} />}
          </View>
          <Text style={[{ fontFamily: "Poppins_400Regular", fontSize: 18 }, textStyle]}>{title}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};



interface ModalProps {
  setModalVisible : Function;
  modalVisible : boolean;
}

export const deepEqual = (obj1 : any, obj2 : any) => {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

export function Filter(props : any){

  const [category , setCategory] = useState("");
  const [brands , setBrands] = useState<any>(null);
  const [color , setColor] = useState<any>("");
  const [lowerBound, setLowerBound] = useState<any>(null);
  const [upperBound, setUpperBound] = useState<any>(null);
  const [filterData , setFilter] = useState<any>({brands : [
    {"label" : "Can't load brands", "value" : "none"},
  ]})

  let marginTop = 0;
  let marginBottom = 0;
  if (Platform.OS === "ios") {
    marginTop = SCREEN_HEIGHT * 0.2;
    marginBottom = (SCREEN_HEIGHT * 0.2) + tabBarHeight;
  }
  else if (Platform.OS === "android"){
    marginTop = SCREEN_HEIGHT * 0.2;
    marginBottom = (SCREEN_HEIGHT * 0.2) + tabBarHeight;
  }
  else {
    marginTop = SCREEN_HEIGHT * 0.2;
    marginBottom = (SCREEN_HEIGHT * 0.2) + tabBarHeight;
  }

  const [priceRange , setPriceRange] = useState<any>({
    min : [{id : "1", label : "0", value : null},], 
    max : [{id : "2", label : "No Limit", value : null}]
  })
  // TODO : Get dropdown options from backend like brands etc. 
  useEffect(() => {
    (async () => {
      const data = await api.getFilter();
      
      // TODO : Save filter progress
      const oldFilter = await getObject("filter")
      if(oldFilter !== null){
        try {
          setBrands(oldFilter["vendor"]["$in"]);
        } catch (e) {
        }
        try {
        setLowerBound(oldFilter.price["$gte"])
        setUpperBound(oldFilter.price["$lte"])
        } catch (e) {}
      }
      
      if (data !== null){
        setFilter(data);
      }
      
    })()



    // major bug fix for duplicate values
    let minValues : any[] = [];
    let maxValues : any[] = [];
    try {
      if (priceRange.max.length > 2){
        return;
      } 
      if(priceRange.min.length > 2){
        return;
      }
    } catch(e){}

    for(let i = 1;i < 20;i++){
      let value = (i) * 1000
      let minValue = value-500;
      let maxValue = value+500;

      if(minValues.indexOf(minValue) !== -1) {continue}
      if(maxValues.indexOf(maxValue) !== -1) {continue}

      minValues.push(minValue);
      maxValues.push(maxValue);


      priceRange.min.push({
        label : `${minValue}`, value : `${minValue}`
      });
      priceRange.max.push({
        label : `${maxValue}`, value : `${maxValue}`
      });

    }
    setPriceRange(priceRange);


  }, [props.modalVisible])

  return (
    
     <Modal
        animationType="none"
        transparent={true}
        visible={props.modalVisible}
        onRequestClose={() => {
          props.setModalVisible(!props.modalVisible);
        }}
           
      >
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
        }}/>
        <View
          style={{
            backgroundColor : "black",
            flex : 1,
            marginTop: marginTop,
            marginBottom : marginBottom,
            marginHorizontal : size.scale(25),
            borderRadius : 8,
            paddingVertical : 30,
          }}
        >

        {/* TODO : Get filter items from backend */}
        <FlatList
          contentContainerStyle={{alignSelf: 'flex-start',marginLeft : 4}}
          numColumns={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          data={[
            {
              id : 1,
              title : "Category", 
              data : [
                {label: 'Clothes', value: 'clothes'},
              ], 
              selected : null,
              range : {min : [1] , max : [1]},
              multiple : true, 
              type : "standard",
              onChange : (t : any) => setCategory(t),
            },
            {
              id : 2,
              title : "Brands", 
              data : filterData.brands, 
              multiple : true,
              selected : brands,
              type : "searchable",
              range : {min : [1] , max : [1]},
              onChange : (t : any) => setBrands(t),
            },
            {
              id : 3,
              title : "Price", 
              data : [],
              selected : lowerBound !== null || upperBound !== null ? {lower : lowerBound , upper : upperBound} : null,
              range : priceRange, 
              multiple : false,
              type : "range", 
              onChange : (lower:any,upper:any) => {setLowerBound(lower);setUpperBound(upper)},
            },
          ]}
          renderItem={({ item }) => <DropDown 
              data={item.data} 
              title={item.title}
              onChange={item.onChange}
              type={item.type}
              range={item.range}
              multiple={item.multiple}
              selected={item.selected}
              onPress={() => {}}
            /> } 
          // TODO : Test this fully
        />
            {/*TODO : Get dropdown data from backend
            TODO : Send this filter data to server  */}
          

            <PrimaryButton
              onPress={async () => {
                props.setModalVisible(false);
                
                let filter : any = {};
                if (brands !== "" && brands !== null) {
                  filter["vendor"] = {"$in" : brands}
                }
                
                let price : any = {};
                let priceSet = false;
                if (lowerBound !== "" && lowerBound !== null) { 
                  price["$gte"] = parseInt(lowerBound);priceSet=true; 
                }
                if (upperBound !== "" && upperBound !== null) { 
                  price["$lte"] = parseInt(upperBound);priceSet = true;
                }
                if (priceSet === true){filter["price"] = price }


                const oldFilter = await getObject("filter")
                if(oldFilter !== null){
                  if (deepEqual(oldFilter , filter) === true){
                    return;
                  }
                }

                props.onConfirm(filter)
                

              }} 
              text="Confirm"
              style={{
                marginHorizontal : size.scale(25),
                paddingVertical : 6,
                fontSize : 4,
                fontWeight : "bold",
              }}
            />

            <SecondaryButton
              onPress={async () => {
                
                props.onClear()

                props.setModalVisible(false);
                
                setLowerBound("")
                setUpperBound("")
                setBrands("")
                setCategory("")

                const oldFilter = await getObject("filter")
                if(oldFilter !== null){
                  if (deepEqual(oldFilter , {}) === true){
                    return;
                  }
                }
                // TODO : clear all items
                setBrands(null)
                setLowerBound(null)
                setUpperBound(null)
                await setObject("filter" , null)
                
                
              }} 
              text="Clear Filters"
              style={{
                marginHorizontal : size.scale(25),
                paddingVertical : 6,
                fontSize : 4,
                fontWeight : "bold",
              }}
            />
            
            </View>
      </Modal>
   
  )
}

export function Sharing(props : ModalProps){
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
            <Text style={{color : "white", fontSize : 30, alignSelf : "center", fontFamily : "Poppins_400Regular", marginTop: 20,}}>
              SHARE
            </Text>

            </View>
      </Modal>
   
  )
}
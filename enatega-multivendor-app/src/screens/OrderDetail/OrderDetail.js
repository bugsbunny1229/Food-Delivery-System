import { TouchableOpacity, View, ScrollView, Dimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { alignment } from '../../utils/alignment'
import styles from './styles'
import React, { useContext, useEffect, useState, useRef } from 'react'
import Spinner from '../../components/Spinner/Spinner'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import TextError from '../../components/Text/TextError/TextError'
import ConfigurationContext from '../../context/Configuration'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import analytics from '../../utils/analytics'
import Detail from '../../components/OrderDetail/Detail/Detail'
import RestaurantMarker from '../../assets/SVG/restaurant-marker'
import CustomerMarker from '../../assets/SVG/customer-marker'
import TrackingRider from '../../components/OrderDetail/TrackingRider/TrackingRider'
import OrdersContext from '../../context/Orders'
import { mapStyle } from '../../utils/mapStyle'
import { useTranslation } from 'react-i18next'
import { HelpButton } from '../../components/Header/HeaderIcons/HeaderIcons'
import OrderPreparing from '../../assets/SVG/order-tracking-preparing'
import {
  ProgressBar,
  checkStatus
} from '../../components/Main/ActiveOrders/ProgressBar'
import { useNavigation } from '@react-navigation/native'
import { PriceRow } from '../../components/OrderDetail/PriceRow'
import { ORDER_STATUS_ENUM } from '../../utils/enums'
import { CancelModal } from '../../components/OrderDetail/CancelModal'
import Button from '../../components/Button/Button'
import { gql, useMutation } from '@apollo/client'
import { cancelOrder as cancelOrderMutation } from '../../apollo/mutations'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { calulateRemainingTime } from '../../utils/customFunctions'
import PlaceOrder from '../../assets/SVG/place-order'
import FoodPicked from '../../assets/SVG/food-picked'
import OrderPlacedIcon from '../../assets/SVG/order-placed'
const { height: HEIGHT } = Dimensions.get('screen')

const CANCEL_ORDER = gql`
  ${cancelOrderMutation}
`

function OrderDetail(props) {
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const Analytics = analytics()
  const id = props.route.params ? props.route.params._id : null
  const user = props.route.params ? props.route.params.user : null
  const { loadingOrders, errorOrders, orders } = useContext(OrdersContext)
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { t } = useTranslation()
  const navigation = useNavigation()
  const cancelModalToggle = () => {
    setCancelModalVisible(!cancelModalVisible)
  }
  const [cancelOrder, { loading: loadingCancel }] = useMutation(CANCEL_ORDER, {
    onError,
    variables: { abortOrderId: id }
  })
  function onError(error) {
    FlashMessage({
      message: error.message
    })
  }
  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_ORDER_DETAIL, {
        orderId: id
      })
    }
    Track()
  }, [])

  const order = orders.find((o) => o._id === id)
  const headerRef = useRef(false)
  if (loadingOrders || !order)
    return (
      <Spinner
        backColor={currentTheme.white}
        spinnerColor={currentTheme.primary}
      />
    )
  if (errorOrders) return <TextError text={JSON.stringify(errorOrders)} />
  if (!headerRef.current) {
    props.navigation.setOptions({
      headerRight: () => HelpButton({ iconBackground: currentTheme.primary }),
      headerTitle: `${order?.deliveryAddress?.deliveryAddress?.substr(
        0,
        20
      )}...`,
      // title: null,
      headerTitleStyle: { color: currentTheme.black },
      headerStyle: { backgroundColor: currentTheme.white }
    })
    headerRef.current = true
  }
  const remainingTime = calulateRemainingTime(order)
  const {
    _id,
    restaurant,
    deliveryAddress,
    items,
    tipping: tip,
    taxationAmount: tax,
    orderAmount: total,
    deliveryCharges
  } = order
  const subTotal = total - tip - tax - deliveryCharges

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: currentTheme.white,
          paddingBottom: scale(100)
        }}
        showsVerticalScrollIndicator={false}
        overScrollMode='never'
      >
        {order.rider && order.orderStatus === ORDER_STATUS_ENUM.PICKED && (
          <MapView
            style={{ flex: 1, height: HEIGHT * 0.6 }}
            showsUserLocation={false}
            initialRegion={{
              latitude: +deliveryAddress.location.coordinates[1],
              longitude: +deliveryAddress.location.coordinates[0],
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            zoomEnabled={true}
            zoomControlEnabled={true}
            rotateEnabled={false}
            customMapStyle={mapStyle}
            provider={PROVIDER_GOOGLE}
          >
            <Marker
              coordinate={{
                longitude: +restaurant.location.coordinates[0],
                latitude: +restaurant.location.coordinates[1]
              }}
            >
              <RestaurantMarker />
            </Marker>
            <Marker
              coordinate={{
                latitude: +deliveryAddress.location.coordinates[1],
                longitude: +deliveryAddress.location.coordinates[0]
              }}
            >
              <CustomerMarker />
            </Marker>
            {order.rider && <TrackingRider id={order.rider._id} />}
          </MapView>
        )}
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            ...alignment.Pmedium
          }}
        >
          <OrderStatusImage status={order.orderStatus} />
          {order.orderStatus !== ORDER_STATUS_ENUM.DELIVERED && (
            <View
              style={{
                ...alignment.MTxSmall,
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {![
                ORDER_STATUS_ENUM.PENDING,
                ORDER_STATUS_ENUM.CANCELLED
              ].includes(order.orderStatus) && (
                <>
                  <TextDefault
                    style={{ ...alignment.MTxSmall }}
                    textColor={currentTheme.gray500}
                    H5
                  >
                    {t('estimatedDeliveryTime')}
                  </TextDefault>
                  <TextDefault
                    style={{ ...alignment.MTxSmall }}
                    Regular
                    textColor={currentTheme.gray900}
                    H1
                    bolder
                  >
                    {remainingTime}-{remainingTime + 5} {t('mins')}
                  </TextDefault>
                  <ProgressBar
                    configuration={configuration}
                    currentTheme={currentTheme}
                    item={order}
                    navigation={navigation}
                  />
                </>
              )}
              <TextDefault
                H5
                style={{ ...alignment.Mmedium, textAlign: 'center' }}
                textColor={currentTheme.gray600}
                bold
              >
                {' '}
                {t(checkStatus(order.orderStatus).statusText)}
              </TextDefault>
            </View>
          )}
        </View>

        {order.orderStatus === 'DELIVERED' && !order.review && (
          <View style={styles().review}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles().floatView, { justifyContent: 'center' }]}
              onPress={() =>
                props.navigation.navigate('RateAndReview', {
                  _id: order._id,
                  restaurant: restaurant,
                  user: user
                })
              }
            >
              <MaterialIcons
                name='rate-review'
                size={scale(20)}
                color={currentTheme.iconColorPink}
              />
              <TextDefault
                textColor={currentTheme.iconColorPink}
                style={[alignment.MBsmall, alignment.MTsmall, alignment.ML10]}
                bolder
                center
              >
                {t('writeAReview')}
              </TextDefault>
            </TouchableOpacity>
          </View>
        )}
        <Detail
          navigation={props.navigation}
          currencySymbol={configuration.currencySymbol}
          items={items}
          from={restaurant.name}
          orderNo={order.orderId}
          deliveryAddress={deliveryAddress.deliveryAddress}
          subTotal={subTotal}
          tip={tip}
          tax={tax}
          deliveryCharges={deliveryCharges}
          total={total}
          theme={currentTheme}
          id={_id}
          rider={order.rider}
          orderStatus={order.orderStatus}
        />
      </ScrollView>
      <View style={styles().bottomContainer(currentTheme)}>
        <PriceRow
          theme={currentTheme}
          title={t('total')}
          currency={configuration.currencySymbol}
          price={total.toFixed(2)}
        />
        {order.orderStatus === ORDER_STATUS_ENUM.PENDING && (
          <View style={{ margin: scale(20) }}>
            <Button
              text={t('cancelOrder')}
              buttonProps={{ onPress: cancelModalToggle }}
              buttonStyles={styles().cancelButtonContainer(currentTheme)}
              textProps={{ textColor: currentTheme.red600 }}
              textStyles={{ ...alignment.Pmedium }}
            />
          </View>
        )}
      </View>
      <CancelModal
        theme={currentTheme}
        modalVisible={cancelModalVisible}
        setModalVisible={cancelModalToggle}
        cancelOrder={cancelOrder}
        loading={loadingCancel}
        orderStatus={order.orderStatus}
      />
    </View>
  )
}

export const OrderStatusImage = ({ status }) => {
  switch (status) {
    case ORDER_STATUS_ENUM.PENDING:
      return <OrderPlacedIcon />
    case ORDER_STATUS_ENUM.ACCEPTED:
      return <OrderPreparing />
    case ORDER_STATUS_ENUM.ASSIGNED:
      return <FoodPicked />
    case ORDER_STATUS_ENUM.CANCELLED:
      return null
    case ORDER_STATUS_ENUM.COMPLETED:
      return <PlaceOrder />
    case ORDER_STATUS_ENUM.DELIVERED:
      return <PlaceOrder />
    default:
      return null
  }
}

export default OrderDetail

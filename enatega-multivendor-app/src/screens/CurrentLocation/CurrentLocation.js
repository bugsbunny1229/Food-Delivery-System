import React, { useContext, useEffect, useState } from 'react'
import {
  View,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native'
import { useLocation } from '../../ui/hooks'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import MapView, { PROVIDER_GOOGLE, Polygon, Marker } from 'react-native-maps'
import { customMapStyle } from '../../utils/customMapStyles'
import LanguageModal from '../../components/LanguageModalize/LanguageModal'
import ModalDropdown from '../../components/Picker/ModalDropdown'
import { LocationContext } from '../../context/Location'
import markerIcon from '../../../assets/Group1000003768.png'
import CustomMarkerWithLabel from '../../assets/SVG/imageComponents/CustomMarkerWithLabel'
import useGeocoding from '../../ui/hooks/useGeocoding'
import Spinner from '../../components/Spinner/Spinner'
import ForceUpdate from '../../components/Update/ForceUpdate'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { checkLocationInCities } from '../../utils/locationUtil'

export default function CurrentLocation() {
  const Analytics = analytics()
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [isCheckingZone, setIsCheckingZone] = useState(false)
  const inset = useSafeAreaInsets()
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { getCurrentLocation, getLocationPermission } = useLocation()
  const [modalVisible, setModalVisible] = useState(false)
  const [citiesModalVisible, setCitiesModalVisible] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const { getAddress } = useGeocoding()

  const { cities, setLocation } = useContext(LocationContext)

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_CURRENTLOCATION)
    }
    Track()
  }, [])

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.white)
    }
    StatusBar.setBarStyle('dark-content')
  })

  useEffect(() => {
    async function fetchLocation() {
      setLoading(true)
      const { status, canAskAgain } = await getLocationPermission()
      if (status !== 'granted' && !canAskAgain) {
        FlashMessage({
          message: t('locationPermissionMessage'),
          onPress: async () => {
            await Linking.openSettings()
          }
        })
        setLoading(false)
        return
      }

      const { error, coords, message } = await getCurrentLocation()
      if (error) {
        console.log(message, error)
        setLoading(false)
        return
      }

      const userLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude
      }

      setCurrentLocation(userLocation)
      setLoading(false)
    }

    fetchLocation()
  }, [])

  useEffect(() => {
    async function checkCityMatch() {
      if (!currentLocation || !cities.length) return

      setIsCheckingZone(true)

      const matchingCity = checkLocationInCities(currentLocation, cities)

      if (matchingCity) {
        try {
          const response = await getAddress(
            currentLocation.latitude,
            currentLocation.longitude
          )

          const locationData = {
            label: 'Location',
            deliveryAddress: response.formattedAddress,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            city: response.city
          }

          setLocation(locationData)
          setTimeout(() => {
            setIsCheckingZone(false)
            navigation.navigate('Main')
          }, 100)
        } catch (error) {
          console.error('Error getting address:', error)
          setIsCheckingZone(false)
        }
      } else {
        setIsCheckingZone(false)
      }
    }

    checkCityMatch()
  }, [currentLocation, cities])

  const initialRegion = {
    latitude: 16.10966,
    longitude: 71.41271,
    latitudeDelta: 130,
    longitudeDelta: 130
  }

  const handleMarkerPress = async (coordinates) => {
    setCitiesModalVisible(false)
    setIsCheckingZone(true)
    const response = await getAddress(
      coordinates.latitude,
      coordinates.longitude
    )
    setLocation({
      label: 'Location',
      deliveryAddress: response.formattedAddress,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: response.city
    })
    setTimeout(() => {
      setIsCheckingZone(false)
      navigation.navigate('Main')
    }, 100)
  }

  useEffect(() => {
    async function checkLanguage() {
      const lang = await AsyncStorage.getItem('enatega-language')
      if (!lang) {
        setModalVisible(true)
      }
    }
    checkLanguage()
  }, [])

  return (
    <>
      <View
        style={[
          styles().flex,
          {
            backgroundColor: currentTheme.themeBackground
          }
        ]}
      >
        <View style={[styles().flex, styles(currentTheme).screenBackground]}>
          <View style={styles().mapView}>
            <MapView
              style={styles().flex}
              provider={PROVIDER_GOOGLE}
              customMapStyle={customMapStyle}
              region={initialRegion}
            >
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  onPress={() => handleMarkerPress(currentLocation)}
                />
              )}

              {cities.map((city) => (
                <React.Fragment key={city.id}>
                  <CustomMarkerWithLabel
                    coordinate={{
                      latitude: city.latitude,
                      longitude: city.longitude
                    }}
                    label={city.name}
                    icon={markerIcon}
                    currentTheme={currentTheme}
                    onPress={() =>
                      handleMarkerPress({
                        latitude: city.latitude,
                        longitude: city.longitude
                      })
                    }
                  />

                  {city?.location &&
                    city?.location.coordinates &&
                    city.location.coordinates[0] && (
                      <Polygon
                        coordinates={city.location.coordinates[0].map(
                          (coord) => ({
                            latitude: coord[1],
                            longitude: coord[0]
                          })
                        )}
                        strokeColor={currentTheme.orderComplete}
                        fillColor={currentTheme.radiusFill}
                        strokeWidth={2}
                      />
                    )}
                </React.Fragment>
              ))}
            </MapView>
          </View>

          <View style={styles(currentTheme).subContainerImage}>
            {loading && (
              <Spinner
                spinnerColor={currentTheme.spinnerColor}
                backColor={currentTheme.themeBackground}
              />
            )}
            <TextDefault
              textColor={currentTheme.fontMainColor}
              center
              bolder
              H2
              style={styles(currentTheme).welcomeHeading}
            >
              {t('welcomeScreen')}
            </TextDefault>
            <TextDefault
              textColor={currentTheme.fontMainColor}
              bold
              center
              style={styles(currentTheme).descriptionEmpty}
            >
              {t('enategaUseYourLocationMessage')}
            </TextDefault>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles(currentTheme).linkButton}
              onPress={() => setCitiesModalVisible(true)}
            >
              <TextDefault textColor={currentTheme.fontMainColor} H5 center>
                {t('exploreYallaCities')}
              </TextDefault>
            </TouchableOpacity>
          </View>
        </View>

        {isCheckingZone && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999
            }}
          >
            <ActivityIndicator size='large' color={currentTheme.spinnerColor} />
          </View>
        )}

        {!modalVisible && <ForceUpdate />}

        <LanguageModal
          currentTheme={currentTheme}
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          dontClose
        />
        <ModalDropdown
          theme={currentTheme}
          visible={citiesModalVisible}
          onItemPress={handleMarkerPress}
          onClose={() => setCitiesModalVisible(false)}
        />
      </View>
    </>
  )
}

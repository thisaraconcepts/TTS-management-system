pipeline {
    agent any
    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                        tar -xzf node.tar.gz
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        
                        npm install
                        chmod +x node_modules/.bin/*
                        npm run build
                    '''
                }
            }
        }
        stage('Deploy to Server') {
            steps {
                sh '''
                    echo "Preparing deployment files..."
                    
                    # Copy to a staging folder inside jenkins_home first (which Jenkins owns)
                    STAGING_DIR="/var/jenkins_home/deploy_staging"
                    mkdir -p $STAGING_DIR
                    rm -rf $STAGING_DIR/*
                    cp -r frontend/dist/* $STAGING_DIR/
                    
                    echo "Files staged successfully at $STAGING_DIR"
                '''
            }
        }
    }
}
